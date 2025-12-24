import { NextRequest, NextResponse } from 'next/server';
import clickhouse, { queryWithMemoryLimit } from '@/lib/clickhouse';
import { requirePermission, type AuthContext } from '@/lib/auth/api-middleware';
import { getDefaultTimezone } from '@/lib/system-settings';
import { getCache, setCache } from '@/lib/cache/cache';
import { resolveAnalyticsDates } from '@/lib/utils/kst-date';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('analytics:read', async (request: NextRequest, context: AuthContext) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const MAX_RANGE_DAYS = 90;
    const sectionName = 'devices';

    // Get date range from query parameters (default: last 30 days)
    const { startDate, endDate } = resolveAnalyticsDates(searchParams, {
      defaultRangeDays: 30,
      maxRangeDays: MAX_RANGE_DAYS
    });

    // Get timezone from system settings (GA behavior: use system default)
    const timezone = await getDefaultTimezone();

    console.log(sectionName);

    // Check cache (30 seconds TTL)
    const cacheTtlMs = 30_000; // 30 seconds
    const cacheKey = `environment-analysis-${sectionName}:${startDate}:${endDate}:${timezone}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Build WHERE clause for date filtering (using created_date_kst for partition pruning)
    const whereClause = `created_date_kst >= toDate('${startDate}') AND created_date_kst <= toDate('${endDate}')`;

    // Device Type Breakdown
    const deviceQuery = `
      SELECT 
        lower(device_type) as device_type,
        uniqExact(user_id) as visitors,
        COUNT(*) as pageviews,
        countIf(event_type = 'conversion') as conversions
      FROM analytics.visit_logs_buffer
        WHERE ${whereClause}
          AND device_type != ''
          AND utm_source != ''
      GROUP BY device_type
      ORDER BY visitors DESC
    `;

    const deviceResult = await queryWithMemoryLimit(deviceQuery, {
      format: 'JSONEachRow',
    });

    const deviceJson = await deviceResult.json() as Array<{
      device_type: string;
      visitors: number;
      pageviews: number;
      conversions: number;
    }>;
    const deviceData = deviceJson.map((row) => ({
      device: row.device_type || 'Unknown',
      visitors: row.visitors || 0,
      pageviews: row.pageviews || 0,
      conversions: row.conversions || 0,
      conversionRate: row.visitors > 0 ? ((row.conversions / row.visitors) * 100).toFixed(2) : '0.00',
    }));

    const response = {
      success: true,
      devices: deviceData,
    };

    await setCache(cacheKey, response, cacheTtlMs);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Environment analysis devices API error:', error);
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

