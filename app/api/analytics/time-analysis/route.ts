import { NextRequest, NextResponse } from 'next/server';
import clickhouse, { queryWithMemoryLimit } from '@/lib/clickhouse';
import { requirePermission, type AuthContext } from '@/lib/auth/api-middleware';
import { getDefaultTimezone } from '@/lib/system-settings';
import { getCache, setCache } from '@/lib/cache/cache';

// Type definitions for the analytics data
interface TimeAnalysisData {
  hour?: number;
  day_of_week?: number;
  visitors: number;
  pageviews: number;
  conversions: number;
}

interface HourlyData {
  hour: number;
  visitors: number;
  pageviews: number;
  conversions: number;
  conversionRate: string;
}

interface DayOfWeekData {
  day: string;
  dayOfWeek: number;
  visitors: number;
  pageviews: number;
  conversions: number;
  conversionRate: string;
}

interface DailyTrendData {
  date: string;
  visitors: number;
  pageviews: number;
  conversions: number;
  conversionRate: string;
}

interface PeakHour {
  hour: number;
  hourLabel: string;
  visitors: number;
}

interface PeakDay {
  day: string;
  visitors: number;
}

export const dynamic = 'force-dynamic';

export const GET = requirePermission('analytics:read', async (request: NextRequest, context: AuthContext) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const MAX_RANGE_DAYS = 90;

    // Get date range from query parameters (default: last 30 days)
    let endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0];
    let startDate = searchParams.get('start_date');

    if (!startDate) {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      startDate = date.toISOString().split('T')[0];
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

    console.log(`⏰ Time Analysis API - Date Range: ${startDate} to ${endDate}, Timezone: ${timezone}`);

    // Check cache (2 minutes TTL)
    const cacheTtlMs = 120_000; // 2 minutes
    const cacheKey = `time-analysis:${startDate}:${endDate}:${timezone}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Build WHERE clause for date filtering (always apply date filtering for memory safety)
    const whereClause = `toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${startDate}') AND toDate(toTimeZone(timestamp, '${timezone}')) <= toDate('${endDate}')`;

    // 1. Hourly Distribution (0-23 hours) - using system default timezone
    const hourlyQuery = `
      SELECT 
        toHour(toTimeZone(timestamp, '${timezone}')) as hour,
        uniqExact(user_id) as visitors,
        COUNT(*) as pageviews,
        countIf(event_type = 'conversion') as conversions
      FROM analytics.visit_logs_buffer
      WHERE ${whereClause}
      GROUP BY hour
      ORDER BY hour ASC
    `;

    const hourlyResult = await queryWithMemoryLimit(hourlyQuery, {
      format: 'JSONEachRow',
    });

    const hourlyJson = await hourlyResult.json() as TimeAnalysisData[];

    // Fill in missing hours with 0
    const hourlyData: HourlyData[] = Array.from({ length: 24 }, (_, i) => {
      const hourData = hourlyJson.find((row: TimeAnalysisData) => row.hour === i);
      return {
        hour: i,
        visitors: hourData?.visitors || 0,
        pageviews: hourData?.pageviews || 0,
        conversions: hourData?.conversions || 0,
        conversionRate: hourData && hourData.visitors > 0
          ? ((hourData.conversions / hourData.visitors) * 100).toFixed(2)
          : '0.00',
      };
    });

    // 2. Day of Week Distribution (1=Monday, 7=Sunday) - using system default timezone
    const dayOfWeekQuery = `
      SELECT 
        toDayOfWeek(toTimeZone(timestamp, '${timezone}')) as day_of_week,
        uniqExact(user_id) as visitors,
        COUNT(*) as pageviews,
        countIf(event_type = 'conversion') as conversions
      FROM analytics.visit_logs_buffer
      WHERE ${whereClause}
      GROUP BY day_of_week
      ORDER BY day_of_week ASC
    `;

    const dayOfWeekResult = await queryWithMemoryLimit(dayOfWeekQuery, {
      format: 'JSONEachRow',
    });

    const dayOfWeekJson = await dayOfWeekResult.json() as TimeAnalysisData[];

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Fill in missing days with 0
    const dayOfWeekData: DayOfWeekData[] = Array.from({ length: 7 }, (_, i) => {
      const dayIndex = i + 1; // ClickHouse: 1=Monday, 7=Sunday
      const dayData = dayOfWeekJson.find((row: TimeAnalysisData) => row.day_of_week === dayIndex);
      return {
        day: dayNames[i],
        dayOfWeek: dayIndex,
        visitors: dayData?.visitors || 0,
        pageviews: dayData?.pageviews || 0,
        conversions: dayData?.conversions || 0,
        conversionRate: dayData && dayData.visitors > 0
          ? ((dayData.conversions / dayData.visitors) * 100).toFixed(2)
          : '0.00',
      };
    });

    // 3. Daily trends over the selected period - using system default timezone
    const dailyTrendQuery = `
      SELECT 
        toDate(toTimeZone(timestamp, '${timezone}')) as date,
        uniqExact(user_id) as visitors,
        COUNT(*) as pageviews,
        countIf(event_type = 'conversion') as conversions
      FROM analytics.visit_logs_buffer
      WHERE ${whereClause}
      GROUP BY date
      ORDER BY date ASC
    `;

    const dailyTrendResult = await queryWithMemoryLimit(dailyTrendQuery, {
      format: 'JSONEachRow',
    });

    const dailyTrendJson = await dailyTrendResult.json() as {
      date: string;
      visitors: number;
      pageviews: number;
      conversions: number
    }[];
    const dailyTrendData: DailyTrendData[] = dailyTrendJson.map((row) => ({
      date: row.date,
      visitors: row.visitors,
      pageviews: row.pageviews,
      conversions: row.conversions,
      conversionRate: row.visitors > 0
        ? ((row.conversions / row.visitors) * 100).toFixed(2)
        : '0.00',
    }));

    // 4. Peak hours analysis
    const peakHours: PeakHour[] = [...hourlyData]
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 3)
      .map(h => ({
        hour: h.hour,
        hourLabel: `${h.hour.toString().padStart(2, '0')}:00`,
        visitors: h.visitors,
      }));

    // 5. Peak days analysis
    const peakDays: PeakDay[] = [...dayOfWeekData]
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 3)
      .map(d => ({
        day: d.day,
        visitors: d.visitors,
      }));

    const response = {
      success: true,
      hourly: hourlyData,
      dayOfWeek: dayOfWeekData,
      dailyTrend: dailyTrendData,
      insights: {
        peakHours,
        peakDays,
      },
    };

    await setCache(cacheKey, response, cacheTtlMs);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Time-based analysis API error:', error);
    const normalizedError = error instanceof Error
      ? error
      : new Error('Unexpected server error');
    return NextResponse.json(
      {
        success: false,
        error: normalizedError.message
      },
      { status: 500 }
    );
  }
});
