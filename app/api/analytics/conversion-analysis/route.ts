import { NextRequest, NextResponse } from 'next/server';
import clickhouse, { queryWithMemoryLimit } from '@/lib/clickhouse';
import { requirePermission, type AuthContext } from '@/lib/auth/api-middleware';
import { getDefaultTimezone } from '@/lib/system-settings';
import { getCache, setCache } from '@/lib/cache/cache';
import { resolveAnalyticsDates } from '@/lib/utils/kst-date';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('analytics:read', async (request: NextRequest, context: AuthContext) => {
  try {
    // Get timezone from system settings (GA behavior: use system default)
    const timezone = await getDefaultTimezone();

    const { searchParams } = new URL(request.url);
    const MAX_RANGE_DAYS = 90;
    
    const { startDate, endDate } = resolveAnalyticsDates(searchParams, {
      endParam: 'endDate',
      startParam: 'startDate',
      defaultRangeDays: 30,
      maxRangeDays: MAX_RANGE_DAYS
    });

    const campaignId = searchParams.get('campaignId');

    // Check cache (30 seconds TTL)
    const cacheTtlMs = 30_000; // 30 seconds
    const cacheKey = `conversion-analysis:${startDate}:${endDate}:${campaignId || 'all'}:${timezone}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Build WHERE clause
    const whereConditions = [`created_date_kst BETWEEN toDate('${startDate}') AND toDate('${endDate}')`];
    whereConditions.push(`event_type = 'conversion'`);

    if (campaignId && campaignId !== 'all') {
      whereConditions.push(`campaign_id = ${campaignId}`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get conversion summary by type
    const conversionSummaryQuery = `
      SELECT 
        conversion_type,
        COUNT(*) as count,
        SUM(conversion_value) as total_value,
        AVG(conversion_value) as avg_value,
        countDistinct(user_id) as unique_users
      FROM analytics.visit_logs_buffer
      WHERE ${whereClause}
        AND conversion_type != ''
      GROUP BY conversion_type
      ORDER BY count DESC
    `;

    const summaryResult = await queryWithMemoryLimit(conversionSummaryQuery, {
      format: 'JSONEachRow'
    });

    const summaryData = await summaryResult.json();

    // Get conversion trend over time
    const conversionTrendQuery = `
      SELECT 
        toDate(toTimeZone(timestamp, '${timezone}')) as date,
        conversion_type,
        COUNT(*) as count,
        SUM(conversion_value) as total_value
      FROM analytics.visit_logs_buffer
      WHERE ${whereClause}
        AND conversion_type != ''
      GROUP BY date, conversion_type
      ORDER BY date ASC, conversion_type
    `;

    const trendResult = await queryWithMemoryLimit(conversionTrendQuery, {
      format: 'JSONEachRow'
    });

    const trendData = await trendResult.json();

    // Get conversion by source/medium
    const conversionBySourceQuery = `
      SELECT 
        utm_source,
        utm_medium,
        conversion_type,
        COUNT(*) as count,
        SUM(conversion_value) as total_value
      FROM analytics.visit_logs_buffer
      WHERE ${whereClause}
        AND conversion_type != ''
        AND utm_source != ''
      GROUP BY utm_source, utm_medium, conversion_type
      ORDER BY count DESC
      LIMIT 20
    `;

    const sourceResult = await queryWithMemoryLimit(conversionBySourceQuery, {
      format: 'JSONEachRow'
    });

    const sourceData = await sourceResult.json();

    // Get conversion funnel (total visitors vs conversions)
    const funnelQuery = `
      SELECT 
        countDistinct(user_id) as total_visitors,
        countIf(event_type = 'conversion') as total_conversions,
        countIf(event_type = 'conversion' AND conversion_type = 'signup') as signup_conversions,
        countIf(event_type = 'conversion' AND conversion_type = 'purchase') as purchase_conversions,
        countIf(event_type = 'conversion' AND conversion_type = 'trial_start') as trial_conversions,
        SUM(CASE WHEN event_type = 'conversion' THEN conversion_value ELSE 0 END) as total_revenue
      FROM analytics.visit_logs_buffer
      WHERE created_date_kst BETWEEN toDate('${startDate}') AND toDate('${endDate}')
      ${campaignId && campaignId !== 'all' ? `AND campaign_id = ${campaignId}` : ''}
    `;

    const funnelResult = await queryWithMemoryLimit(funnelQuery, {
      format: 'JSONEachRow'
    });

    const funnelData = await funnelResult.json() as Array<{
      total_visitors: number;
      total_conversions: number;
      signup_conversions: number;
      purchase_conversions: number;
      trial_conversions: number;
      total_revenue: number;
    }>;

    const response = {
      success: true,
      data: {
        summary: summaryData,
        trend: trendData,
        bySource: sourceData,
        funnel: funnelData[0] || {}
      }
    };

    await setCache(cacheKey, response, cacheTtlMs);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Conversion analysis error:', error);
    const normalizedError = error instanceof Error
      ? error
      : new Error('Unexpected server error');
    return NextResponse.json(
      {
        success: false,
        error: normalizedError.message || 'Failed to fetch conversion analytics'
      },
      { status: 500 }
    );
  }
});

