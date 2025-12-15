import { NextRequest, NextResponse } from 'next/server';
import clickhouse, { queryWithMemoryLimit } from '@/lib/clickhouse';
import { requirePermission, type AuthContext } from '@/lib/auth/api-middleware';
import { getDefaultTimezone } from '@/lib/system-settings';
import { getCache, setCache } from '@/lib/cache/cache';

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

    console.log(`🌍 Environment Analysis API - Date Range: ${startDate} to ${endDate}, Timezone: ${timezone}`);

    // Check cache (2 minutes TTL)
    const cacheTtlMs = 120_000; // 2 minutes
    const cacheKey = `environment-analysis:${startDate}:${endDate}:${timezone}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Build WHERE clause for date filtering (using system default timezone)
    // Always apply date filtering (required for memory safety)
    const whereClause = `toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${startDate}') AND toDate(toTimeZone(timestamp, '${timezone}')) <= toDate('${endDate}')`;

    // 1. Device Type Breakdown (optimized: avoid subquery, use uniqExact)
    const deviceQuery = `
      SELECT 
        lower(device_type) as device_type,
        uniqExact(user_id) as visitors,
        COUNT(*) as pageviews,
        countIf(event_type = 'conversion') as conversions
      FROM analytics.visit_logs_buffer
        WHERE ${whereClause}
          AND device_type != ''
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

    // 2. Operating System Breakdown (optimized: avoid subquery)
    const osQuery = `
        SELECT 
          CASE 
            WHEN lower(os) = 'ios' THEN 'iOS'
            WHEN lower(os) = 'mac os' THEN 'macOS'
            WHEN lower(os) = 'android' THEN 'Android'
            WHEN lower(os) = 'windows' THEN 'Windows'
            WHEN lower(os) = 'linux' THEN 'Linux'
            ELSE os
          END as os,
        uniqExact(user_id) as visitors,
        COUNT(*) as pageviews,
        countIf(event_type = 'conversion') as conversions
      FROM analytics.visit_logs_buffer
        WHERE ${whereClause}
          AND os != ''
      GROUP BY os
      ORDER BY visitors DESC
    `;

    const osResult = await queryWithMemoryLimit(osQuery, {
      format: 'JSONEachRow',
    });

    const osJson = await osResult.json() as Array<{
      os: string;
      visitors: number;
      pageviews: number;
      conversions: number;
    }>;
    const osData = osJson.map((row) => ({
      os: row.os || 'Unknown',
      visitors: row.visitors || 0,
      pageviews: row.pageviews || 0,
      conversions: row.conversions || 0,
      conversionRate: row.visitors > 0 ? ((row.conversions / row.visitors) * 100).toFixed(2) : '0.00',
    }));

    // 3. Browser Breakdown (optimized: avoid subquery)
    const browserQuery = `
        SELECT 
          CASE 
            WHEN lower(browser) LIKE '%chrome%' AND lower(browser) NOT LIKE '%edg%' THEN 'Chrome'
            WHEN lower(browser) LIKE '%safari%' AND lower(browser) NOT LIKE '%chrome%' THEN 'Safari'
            WHEN lower(browser) LIKE '%firefox%' THEN 'Firefox'
            WHEN lower(browser) LIKE '%edge%' OR lower(browser) LIKE '%edg%' THEN 'Edge'
            WHEN lower(browser) LIKE '%opera%' THEN 'Opera'
            WHEN lower(browser) = 'ie' OR lower(browser) LIKE '%internet explorer%' THEN 'Internet Explorer'
            ELSE browser
          END as browser,
        uniqExact(user_id) as visitors,
        COUNT(*) as pageviews,
        countIf(event_type = 'conversion') as conversions
      FROM analytics.visit_logs_buffer
        WHERE ${whereClause}
          AND browser != ''
      GROUP BY browser
      ORDER BY visitors DESC
    `;

    const browserResult = await queryWithMemoryLimit(browserQuery, {
      format: 'JSONEachRow',
    });

    const browserJson = await browserResult.json() as Array<{
      browser: string;
      visitors: number;
      pageviews: number;
      conversions: number;
    }>;
    const browserData = browserJson.map((row) => ({
      browser: row.browser || 'Unknown',
      visitors: row.visitors || 0,
      pageviews: row.pageviews || 0,
      conversions: row.conversions || 0,
      conversionRate: row.visitors > 0 ? ((row.conversions / row.visitors) * 100).toFixed(2) : '0.00',
    }));

    // 4. Screen Resolution Breakdown (top 10)
    const resolutionQuery = `
      SELECT 
        screen_resolution,
        uniqExact(user_id) as visitors,
        COUNT(*) as pageviews
      FROM analytics.visit_logs_buffer
      WHERE ${whereClause}
        AND screen_resolution != ''
      GROUP BY screen_resolution
      ORDER BY visitors DESC
      LIMIT 10
    `;

    const resolutionResult = await queryWithMemoryLimit(resolutionQuery, {
      format: 'JSONEachRow',
    });

    const resolutionJson = await resolutionResult.json() as Array<{
      screen_resolution: string;
      visitors: number;
      pageviews: number;
    }>;
    const resolutionData = resolutionJson.map((row) => ({
      resolution: row.screen_resolution || 'Unknown',
      visitors: row.visitors || 0,
      pageviews: row.pageviews || 0,
    }));

    const response = {
      success: true,
      devices: deviceData,
      os: osData,
      browsers: browserData,
      resolutions: resolutionData,
    };

    await setCache(cacheKey, response, cacheTtlMs);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Environment analysis API error:', error);
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
