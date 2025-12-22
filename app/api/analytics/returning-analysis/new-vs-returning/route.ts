import { NextRequest, NextResponse } from 'next/server';
import { queryWithMemoryLimit } from '@/lib/clickhouse';
import { requirePermission, type AuthContext } from '@/lib/auth/api-middleware';
import { getDefaultTimezone } from '@/lib/system-settings';
import { getCache, setCache } from '@/lib/cache/cache';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('analytics:read', async (request: NextRequest, context: AuthContext) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const MAX_RANGE_DAYS = 90;
    const sectionName = 'new-vs-returning';

    let endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0];
    let startDate = searchParams.get('start_date');

    if (!startDate) {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      startDate = date.toISOString().split('T')[0];
    }

    const startObj = new Date(startDate);
    const endObj = new Date(endDate);
    const diffMs = endObj.getTime() - startObj.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > MAX_RANGE_DAYS) {
      const clampedStart = new Date(endObj);
      clampedStart.setDate(clampedStart.getDate() - MAX_RANGE_DAYS);
      startDate = clampedStart.toISOString().split('T')[0];
    }

    const timezone = await getDefaultTimezone();

    console.log('new-vs-returning');

    const cacheTtlMs = 30_000;
    const cacheKey = `returning-analysis-${sectionName}:${startDate}:${endDate}:${timezone}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const whereClause = `toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${startDate}') AND toDate(toTimeZone(timestamp, '${timezone}')) <= toDate('${endDate}')`;

    // Get total visitors
    const totalVisitorsQuery = `
      SELECT uniqExact(user_id) as total_visitors
      FROM analytics.visit_logs_buffer
      WHERE ${whereClause}
        AND utm_source != ''
    `;

    const totalVisitorsResult = await queryWithMemoryLimit(totalVisitorsQuery, {
      format: 'JSONEachRow',
    });

    const totalVisitorsJson = await totalVisitorsResult.json() as Array<{ total_visitors: number }>;
    const totalVisitors = totalVisitorsJson[0]?.total_visitors || 0;

    // Get new vs returning breakdown
    const newVsReturningQuery = `
      WITH user_first_sessions AS (
          SELECT 
            user_id,
            toDate(MIN(toTimeZone(timestamp, '${timezone}'))) as first_session_date
        FROM analytics.visit_logs_buffer
        WHERE toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${startDate}') - INTERVAL 365 DAY
          AND toDate(toTimeZone(timestamp, '${timezone}')) <= toDate('${endDate}')
          AND utm_source != ''
          GROUP BY user_id
      )
      SELECT 
        if(
          ufs.first_session_date >= toDate('${startDate}') 
          AND ufs.first_session_date <= toDate('${endDate}'),
          'new',
          'returning'
        ) AS visitor_type,
        uniqExact(vl.user_id) AS visitors,
        COUNT(*) AS pageviews,
        countIf(vl.event_type = 'conversion') AS conversions,
        AVG(vl.time_on_page) AS avg_time_on_page
      FROM analytics.visit_logs_buffer vl
      INNER JOIN user_first_sessions ufs ON vl.user_id = ufs.user_id
      WHERE ${whereClause}
        AND vl.utm_source != ''
      GROUP BY visitor_type
    `;

    const newVsReturningResult = await queryWithMemoryLimit(newVsReturningQuery, {
      format: 'JSONEachRow',
    });

    const newVsReturningJson = await newVsReturningResult.json() as Array<{
      visitor_type: string;
      visitors: number;
      pageviews: number;
      conversions: number;
      avg_time_on_page: number;
    }>;

    const newVisitorsData = newVsReturningJson.find((row) => row.visitor_type === 'new') || {
      visitor_type: 'new',
      visitors: 0,
      pageviews: 0,
      conversions: 0,
      avg_time_on_page: 0
    };

    const returningVisitorsData = newVsReturningJson.find((row) => row.visitor_type === 'returning') || {
      visitor_type: 'returning',
      visitors: 0,
      pageviews: 0,
      conversions: 0,
      avg_time_on_page: 0
    };

    const newVsReturning = {
      new: {
        visitors: newVisitorsData.visitors,
        pageviews: newVisitorsData.pageviews,
        conversions: newVisitorsData.conversions,
        conversionRate: newVisitorsData.visitors > 0
          ? ((newVisitorsData.conversions / newVisitorsData.visitors) * 100).toFixed(2)
          : '0.00',
        avgTimeOnPage: Math.round(newVisitorsData.avg_time_on_page),
        percentage: totalVisitors > 0
          ? ((newVisitorsData.visitors / totalVisitors) * 100).toFixed(1)
          : '0.0',
      },
      returning: {
        visitors: returningVisitorsData.visitors,
        pageviews: returningVisitorsData.pageviews,
        conversions: returningVisitorsData.conversions,
        conversionRate: returningVisitorsData.visitors > 0
          ? ((returningVisitorsData.conversions / returningVisitorsData.visitors) * 100).toFixed(2)
          : '0.00',
        avgTimeOnPage: Math.round(returningVisitorsData.avg_time_on_page),
        percentage: totalVisitors > 0
          ? ((returningVisitorsData.visitors / totalVisitors) * 100).toFixed(1)
          : '0.0',
      },
    };

    const response = {
      success: true,
      newVsReturning,
    };

    await setCache(cacheKey, response, cacheTtlMs);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Returning analysis new-vs-returning API error:', error);
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

