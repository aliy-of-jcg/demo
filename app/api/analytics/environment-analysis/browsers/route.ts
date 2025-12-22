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
    const sectionName = 'browsers';

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

    console.log(sectionName);

    // Check cache (30 seconds TTL)
    const cacheTtlMs = 30_000; // 30 seconds
    const cacheKey = `environment-analysis-${sectionName}:${startDate}:${endDate}:${timezone}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Build WHERE clause for date filtering (using system default timezone)
    const whereClause = `toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${startDate}') AND toDate(toTimeZone(timestamp, '${timezone}')) <= toDate('${endDate}')`;

    // Browser Breakdown
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
          AND utm_source != ''
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

    const response = {
      success: true,
      browsers: browserData,
    };

    await setCache(cacheKey, response, cacheTtlMs);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Environment analysis browsers API error:', error);
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

