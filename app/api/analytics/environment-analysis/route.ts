import { NextRequest, NextResponse } from 'next/server';
import clickhouse from '@/lib/clickhouse';
import { requirePermission, type AuthContext } from '@/lib/auth/api-middleware';
import { getDefaultTimezone } from '@/lib/system-settings';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('analytics:read', async (request: NextRequest, context: AuthContext) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Get timezone from system settings (GA behavior: use system default)
    const timezone = await getDefaultTimezone();

    console.log(`🌍 Environment Analysis API - Date Range: ${startDate || 'default'} to ${endDate || 'default'}, Timezone: ${timezone}`);

    // Build WHERE clause for date filtering (using system default timezone)
    let whereClause = '1=1';

    if (startDate) {
      whereClause += ` AND toDate(toTimeZone(timestamp, '${timezone}')) >= '${startDate}'`;
    }
    if (endDate) {
      whereClause += ` AND toDate(toTimeZone(timestamp, '${timezone}')) <= '${endDate}'`;
    }

    // 1. Device Type Breakdown (normalize to lowercase using subquery)
    const deviceQuery = `
      SELECT 
        device_type,
        countDistinct(user_id) as visitors,
        COUNT(*) as pageviews,
        countIf(event_type = 'conversion') as conversions
      FROM (
        SELECT 
          lower(device_type) as device_type,
          user_id,
          event_type
        FROM analytics.visit_logs
        WHERE ${whereClause}
          AND device_type != ''
      )
      GROUP BY device_type
      ORDER BY visitors DESC
    `;

    const deviceResult = await clickhouse.query({
      query: deviceQuery,
      format: 'JSONEachRow',
    });

    const deviceJson = await deviceResult.json();
    const deviceData = deviceJson.map((row: any) => ({
      device: row.device_type || 'Unknown',
      visitors: row.visitors || 0,
      pageviews: row.pageviews || 0,
      conversions: row.conversions || 0,
      conversionRate: row.visitors > 0 ? ((row.conversions / row.visitors) * 100).toFixed(2) : '0.00',
    }));

    // 2. Operating System Breakdown (normalize case)
    const osQuery = `
      SELECT 
        os,
        countDistinct(user_id) as visitors,
        COUNT(*) as pageviews,
        countIf(event_type = 'conversion') as conversions
      FROM (
        SELECT 
          CASE 
            WHEN lower(os) = 'ios' THEN 'iOS'
            WHEN lower(os) = 'mac os' THEN 'macOS'
            WHEN lower(os) = 'android' THEN 'Android'
            WHEN lower(os) = 'windows' THEN 'Windows'
            WHEN lower(os) = 'linux' THEN 'Linux'
            ELSE os
          END as os,
          user_id,
          event_type
        FROM analytics.visit_logs
        WHERE ${whereClause}
          AND os != ''
      )
      GROUP BY os
      ORDER BY visitors DESC
    `;

    const osResult = await clickhouse.query({
      query: osQuery,
      format: 'JSONEachRow',
    });

    const osJson = await osResult.json();
    const osData = osJson.map((row: any) => ({
      os: row.os || 'Unknown',
      visitors: row.visitors || 0,
      pageviews: row.pageviews || 0,
      conversions: row.conversions || 0,
      conversionRate: row.visitors > 0 ? ((row.conversions / row.visitors) * 100).toFixed(2) : '0.00',
    }));

    // 3. Browser Breakdown (normalize case)
    const browserQuery = `
      SELECT 
        browser,
        countDistinct(user_id) as visitors,
        COUNT(*) as pageviews,
        countIf(event_type = 'conversion') as conversions
      FROM (
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
          user_id,
          event_type
        FROM analytics.visit_logs
        WHERE ${whereClause}
          AND browser != ''
      )
      GROUP BY browser
      ORDER BY visitors DESC
    `;

    const browserResult = await clickhouse.query({
      query: browserQuery,
      format: 'JSONEachRow',
    });

    const browserJson = await browserResult.json();
    const browserData = browserJson.map((row: any) => ({
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
        countDistinct(user_id) as visitors,
        COUNT(*) as pageviews
      FROM analytics.visit_logs
      WHERE ${whereClause}
        AND screen_resolution != ''
      GROUP BY screen_resolution
      ORDER BY visitors DESC
      LIMIT 10
    `;

    const resolutionResult = await clickhouse.query({
      query: resolutionQuery,
      format: 'JSONEachRow',
    });

    const resolutionJson = await resolutionResult.json();
    const resolutionData = resolutionJson.map((row: any) => ({
      resolution: row.screen_resolution || 'Unknown',
      visitors: row.visitors || 0,
      pageviews: row.pageviews || 0,
    }));

    return NextResponse.json({
      success: true,
      devices: deviceData,
      os: osData,
      browsers: browserData,
      resolutions: resolutionData,
    });

  } catch (error) {
    console.error('Environment analysis API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
});
