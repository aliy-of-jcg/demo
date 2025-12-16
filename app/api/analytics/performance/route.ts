import { NextRequest, NextResponse } from 'next/server';
import clickhouse, { queryWithMemoryLimit } from '@/lib/clickhouse';
import { getPool } from '@/lib/mysql';
import { requirePermission, type AuthContext } from '@/lib/auth/api-middleware';
import { getDefaultTimezone, getSettingsWithDefaults } from '@/lib/system-settings';
import { getCache, setCache } from '@/lib/cache/cache';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('analytics:read', async (request: NextRequest, context: AuthContext) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const MAX_RANGE_DAYS = 90;

    // Get system defaults (GA-style global config)
    const settings = await getSettingsWithDefaults();

    // Get raw date range from query parameters
    let endDate = searchParams.get('end') || new Date().toISOString().split('T')[0];
    let startDate = searchParams.get('start');

    // If no explicit start provided, use system default_date_range
    if (!startDate) {
      const days = settings.default_date_range ?? 7;
      const end = new Date(endDate);
      const start = new Date(end);
      start.setDate(start.getDate() - days);
      startDate = start.toISOString().split('T')[0];
    }

    // Enforce maximum date window (server-side safety net)
    const startObj = new Date(startDate);
    const endObj = new Date(endDate);
    const diffMs = endObj.getTime() - startObj.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > MAX_RANGE_DAYS) {
      const clampedStart = new Date(endObj);
      clampedStart.setDate(clampedStart.getDate() - MAX_RANGE_DAYS);
      startDate = clampedStart.toISOString().split('T')[0];
    }

    // Get timezone from system settings (GA behavior: use system default)
    const timezone = await getDefaultTimezone();

    console.log(`📊 Performance Dashboard API - Date Range: ${startDate} to ${endDate}, Timezone: ${timezone}`);

    // Check cache (2 minutes TTL)
    const cacheTtlMs = 120_000; // 2 minutes
    const cacheKey = `performance:${startDate}:${endDate}:${timezone}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Calculate comparison period (previous period of same length)
    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();
    const periodLength = endMs - startMs;
    const comparisonStart = new Date(startMs - periodLength).toISOString().split('T')[0];
    const comparisonEnd = new Date(startMs - 1).toISOString().split('T')[0];

    try {
      // Query 1: Summary Metrics (visitors, conversions, revenue)
      // OPTIMIZED: Use uniqExact instead of countDistinct, calculate conversion_rate separately
      const metricsQuery = `
        SELECT 
          uniqExact(user_id) as total_visitors,
          SUM(CASE WHEN event_type = 'conversion' THEN 1 ELSE 0 END) as conversions
        FROM analytics.visit_logs_buffer
        WHERE toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${startDate}')
          AND toDate(toTimeZone(timestamp, '${timezone}')) <= toDate('${endDate}')
      `;

      const metricsResult = await queryWithMemoryLimit(metricsQuery, {
        format: 'JSONEachRow',
        queryMode: 'exact' // Keep exact for KPIs
      });
      const metricsData = await metricsResult.json() as Array<{
        total_visitors: number;
        conversions: number;
      }>;
      const metrics = metricsData[0] || { total_visitors: 0, conversions: 0 };
      // Calculate conversion rate in application code to avoid double aggregation
      const conversionRate = metrics.total_visitors > 0 
        ? (metrics.conversions * 100.0 / metrics.total_visitors).toFixed(2)
        : '0.00';

      // Query 2: Get revenue from MySQL campaigns (budget spent)
      const pool = getPool();
      const [revenueResult] = await pool.execute(`
      SELECT COALESCE(SUM(spent), 0) as total_spent
      FROM campaigns
      WHERE start_date >= ? AND end_date <= ?
    `, [startDate, endDate]);

      const revenue = (revenueResult as any[])[0]?.total_spent || 0;

      // Query 3: Channel Breakdown (by utm_source)
      // OPTIMIZED: Use uniqExact, calculate conversion_rate in application code
      const channelQuery = `
      SELECT 
        CASE 
          WHEN utm_source = '' OR utm_source = '(direct)' OR utm_source = 'Direct' THEN 'Direct'
          ELSE utm_source
        END as channel,
        uniqExact(user_id) as visitors,
        SUM(CASE WHEN event_type = 'conversion' THEN 1 ELSE 0 END) as conversions
      FROM analytics.visit_logs_buffer
      WHERE toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${startDate}')
        AND toDate(toTimeZone(timestamp, '${timezone}')) <= toDate('${endDate}')
      GROUP BY channel
      ORDER BY visitors DESC
      LIMIT 10
    `;

      const channelResult = await queryWithMemoryLimit(channelQuery, {
        format: 'JSONEachRow',
        queryMode: 'exact' // Keep exact for KPIs
      });
      const channelData = await channelResult.json() as Array<{
        channel: string;
        visitors: number;
        conversions: number;
      }>;

      // Get campaign budgets for each channel to calculate CPA
      const channelDataEnhanced = await Promise.all(
        channelData.map(async (channel) => {
          const [budgetResult] = await pool.execute(`
          SELECT COALESCE(SUM(spent), 0) as channel_spent
          FROM campaigns
          WHERE source = ?
          AND start_date >= ? AND end_date <= ?
        `, [channel.channel === 'Direct' ? '' : channel.channel, startDate, endDate]);

          const spent = (budgetResult as any[])[0]?.channel_spent || 0;
          const cpa = channel.conversions > 0 ? spent / channel.conversions : 0;
          // Calculate conversion rate in application code
          const conversionRate = channel.visitors > 0 
            ? (channel.conversions * 100.0 / channel.visitors).toFixed(2)
            : '0.00';

          return {
            channel: channel.channel,
            visitors: channel.visitors,
            conversions: channel.conversions,
            rate: conversionRate,
            revenue: spent, // Using spent as revenue for now
            cpa: Math.round(cpa)
          };
        })
      );

      // Query 4: Daily Visitor Trend (current period)
      // OPTIMIZED: Use uniqExact, use >= and <= instead of BETWEEN
      const trendQuery = `
      SELECT 
        toDate(toTimeZone(timestamp, '${timezone}')) as date,
        uniqExact(user_id) as visitors
      FROM analytics.visit_logs_buffer
      WHERE toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${startDate}')
        AND toDate(toTimeZone(timestamp, '${timezone}')) <= toDate('${endDate}')
      GROUP BY date
      ORDER BY date ASC
    `;

      const trendResult = await queryWithMemoryLimit(trendQuery, {
        format: 'JSONEachRow',
        queryMode: 'exact' // Keep exact for time-series
      });
      const trendData = await trendResult.json() as Array<{
        date: string;
        visitors: number;
      }>;

      // Query 5: Comparison Period Trend
      // OPTIMIZED: Use uniqExact, use >= and <= instead of BETWEEN
      const comparisonTrendQuery = `
      SELECT 
        toDate(toTimeZone(timestamp, '${timezone}')) as date,
        uniqExact(user_id) as visitors
      FROM analytics.visit_logs_buffer
      WHERE toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${comparisonStart}')
        AND toDate(toTimeZone(timestamp, '${timezone}')) <= toDate('${comparisonEnd}')
      GROUP BY date
      ORDER BY date ASC
    `;

      const comparisonTrendResult = await queryWithMemoryLimit(comparisonTrendQuery, {
        format: 'JSONEachRow',
        queryMode: 'exact' // Keep exact for time-series
      });
      const comparisonTrendData = await comparisonTrendResult.json() as Array<{
        date: string;
        visitors: number;
      }>;

      // Format response
      const response = {
        success: true,
        dateRange: {
          start: startDate,
          end: endDate
        },
        metrics: {
          totalVisitors: metrics.total_visitors || 0,
          conversions: metrics.conversions || 0,
          conversionRate: conversionRate,
          revenue: parseFloat(revenue)
        },
        channelData: channelDataEnhanced,
        visitorTrend: {
          current: trendData.map((item) => ({
            date: item.date,
            visitors: parseInt(item.visitors.toString())
          })),
          comparison: comparisonTrendData.map((item) => ({
            date: item.date,
            visitors: parseInt(item.visitors.toString())
          }))
        }
      };

      console.log(`✅ Performance data fetched: ${response.metrics.totalVisitors} visitors, ${channelDataEnhanced.length} channels`);

      await setCache(cacheKey, response, cacheTtlMs);
      return NextResponse.json(response);

    } catch (chError: any) {
      // Check if table doesn't exist
      if (chError.code === '60' || chError.type === 'UNKNOWN_TABLE' ||
        (chError.message && chError.message.includes('visit_logs'))) {
        console.warn('⚠️ Analytics tables do not exist yet');
        return NextResponse.json({
          success: true,
          dateRange: {
            start: startDate,
            end: endDate
          },
          metrics: {
            totalVisitors: 0,
            conversions: 0,
            conversionRate: '0.00',
            revenue: 0
          },
          channelData: [],
          visitorTrend: {
            current: [],
            comparison: []
          },
          message: 'No analytics data available yet. Start tracking campaigns to see performance metrics.'
        });
      }
      // Normalize error before re-throwing
      throw chError instanceof Error
        ? chError
        : new Error('Unexpected server error');
    }

  } catch (error) {
    console.error('❌ Performance Dashboard API Error:', error);
    const normalizedError = error instanceof Error
      ? error
      : new Error('Unexpected server error');

    // Fallback date range calculation
    const fallbackEndDate = new Date().toISOString().split('T')[0];
    const fallbackStartDate = (() => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date.toISOString().split('T')[0];
    })();

    return NextResponse.json(
      {
        success: true,
        dateRange: {
          start: fallbackStartDate,
          end: fallbackEndDate
        },
        metrics: {
          totalVisitors: 0,
          conversions: 0,
          conversionRate: '0.00',
          revenue: 0
        },
        channelData: [],
        visitorTrend: {
          current: [],
          comparison: []
        },
        message: 'Unable to fetch performance data. Please try again later.'
      },
      { status: 200 }
    );
  }
});

