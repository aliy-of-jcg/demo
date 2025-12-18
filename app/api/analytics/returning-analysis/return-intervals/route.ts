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
    const sectionName = 'return-intervals';

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

    console.log('return-intervals');

    const cacheTtlMs = 30_000;
    const cacheKey = `returning-analysis-${sectionName}:${startDate}:${endDate}:${timezone}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // GA-style return interval requires lookback so the first in-range session can still have a previous session.
    // Align lookback with other returning-analysis endpoints (new-vs-returning uses 365 days).
    const LOOKBACK_DAYS = 365;
    const lookbackWhereClause = `toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${startDate}') - INTERVAL ${LOOKBACK_DAYS} DAY AND toDate(toTimeZone(timestamp, '${timezone}')) <= toDate('${endDate}')`;

    // IMPORTANT:
    // - Do NOT filter out `is_new_visitor = 1` rows before computing lag(); that breaks the visit(1)->visit(2) interval.
    // - Include 0-day intervals so "Same day" is meaningful.
    // - Aggregate in ClickHouse to avoid streaming a large per-user/per-session result to Node.
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
        multiIf(
          return_interval_days = 0, 'Same day',
          return_interval_days BETWEEN 1 AND 3, '1-3 days',
          return_interval_days BETWEEN 4 AND 7, '4-7 days',
          return_interval_days BETWEEN 8 AND 14, '8-14 days',
          return_interval_days BETWEEN 15 AND 30, '15-30 days',
          return_interval_days >= 31, '31+ days',
          'Other'
        ) AS label,
        uniqExact(user_id) AS users
      FROM intervals
      WHERE return_interval_days IS NOT NULL
        AND return_interval_days >= 0
        AND toDate(session_start) >= report_start
        AND toDate(session_start) <= report_end
      GROUP BY label
    `;

    const returnIntervalResult = await queryWithMemoryLimit(returnIntervalQuery, {
      // Low-cardinality aggregation -> prefer exact mode (no partial results)
      queryMode: 'exact',
      format: 'JSONEachRow',
    });

    const returnIntervalJson = await returnIntervalResult.json() as Array<{
      label: string;
      users: number;
    }>;

    const intervalBuckets = [
      { label: 'Same day', min: 0, max: 0, users: 0 },
      { label: '1-3 days', min: 1, max: 3, users: 0 },
      { label: '4-7 days', min: 4, max: 7, users: 0 },
      { label: '8-14 days', min: 8, max: 14, users: 0 },
      { label: '15-30 days', min: 15, max: 30, users: 0 },
      { label: '31+ days', min: 31, max: Infinity, users: 0 },
    ];

    // Merge ClickHouse aggregation into our fixed bucket order (and ignore unexpected labels)
    const usersByLabel = new Map(returnIntervalJson.map((r) => [r.label, r.users]));
    intervalBuckets.forEach((b) => {
      b.users = usersByLabel.get(b.label) ?? 0;
    });

    const response = {
      success: true,
      returnIntervals: intervalBuckets,
    };

    await setCache(cacheKey, response, cacheTtlMs);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Returning analysis return-intervals API error:', error);
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

