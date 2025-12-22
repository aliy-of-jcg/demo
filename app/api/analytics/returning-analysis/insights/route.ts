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
    const sectionName = 'insights';

    // Get date range from query parameters
    let endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0];
    let startDate = searchParams.get('start_date');

    if (!startDate) {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      startDate = date.toISOString().split('T')[0];
    }

    // Enforce maximum date window
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

    console.log('insights');

    // Check cache (30 seconds TTL)
    const cacheTtlMs = 30_000;
    const cacheKey = `returning-analysis-${sectionName}:${startDate}:${endDate}:${timezone}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const whereClause = `toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${startDate}') AND toDate(toTimeZone(timestamp, '${timezone}')) <= toDate('${endDate}')`;
    const LOOKBACK_DAYS = 365;
    const lookbackWhereClause = `toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${startDate}') - INTERVAL ${LOOKBACK_DAYS} DAY AND toDate(toTimeZone(timestamp, '${timezone}')) <= toDate('${endDate}')`;

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
        uniqExact(vl.user_id) AS visitors
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
    }>;

    const newVisitors = newVsReturningJson.find((row) => row.visitor_type === 'new')?.visitors || 0;
    const returningVisitors = newVsReturningJson.find((row) => row.visitor_type === 'returning')?.visitors || 0;

    // Get average return interval
    const returnIntervalQuery = `
      WITH
        toDate('${startDate}') AS report_start,
        toDate('${endDate}') AS report_end
      , user_sessions AS (
          SELECT
            user_id,
            visit_count,
            min(toTimeZone(timestamp, '${timezone}')) AS session_start
          FROM analytics.visit_logs_buffer
          WHERE ${lookbackWhereClause}
            AND utm_source != ''
          GROUP BY user_id, visit_count
        )
      , intervals AS (
          SELECT
            user_id,
            visit_count,
            session_start,
            dateDiff(
              'day',
              toDate(lag(session_start) OVER (PARTITION BY user_id ORDER BY session_start)),
              toDate(session_start)
            ) AS return_interval_days
          FROM user_sessions
        )
      SELECT
        AVG(return_interval_days) AS avg_interval
      FROM intervals
      WHERE return_interval_days IS NOT NULL
        AND return_interval_days >= 0
        AND toDate(session_start) >= report_start
        AND toDate(session_start) <= report_end
    `;

    const returnIntervalResult = await queryWithMemoryLimit(returnIntervalQuery, {
      queryMode: 'exact',
      format: 'JSONEachRow',
    });

    const returnIntervalJson = await returnIntervalResult.json() as Array<{ avg_interval: number }>;
    const avgReturnInterval = Math.round(returnIntervalJson[0]?.avg_interval || 0);

    const response = {
      success: true,
      insights: {
        newVisitors,
        returningVisitors,
        totalVisitors,
        avgReturnInterval,
        newPercentage: totalVisitors > 0 ? ((newVisitors / totalVisitors) * 100).toFixed(1) : '0.0',
        returningPercentage: totalVisitors > 0 ? ((returningVisitors / totalVisitors) * 100).toFixed(1) : '0.0',
      },
    };

    await setCache(cacheKey, response, cacheTtlMs);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Returning analysis insights API error:', error);
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

