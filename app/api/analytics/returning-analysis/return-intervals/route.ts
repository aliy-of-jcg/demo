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

    const whereClause = `toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${startDate}') AND toDate(toTimeZone(timestamp, '${timezone}')) <= toDate('${endDate}')`;

    const returnIntervalQuery = `
      WITH user_visits AS (
        SELECT
          user_id,
          visit_count,
          MIN(timestamp) AS visit_start
        FROM analytics.visit_logs_buffer
        WHERE ${whereClause}
          AND is_new_visitor = 0
        GROUP BY user_id, visit_count
      ),
      intervals AS (
        SELECT
          user_id,
          visit_count,
          visit_start,
          dateDiff(
            'day',
            lag(visit_start) OVER (PARTITION BY user_id ORDER BY visit_start),
            visit_start
          ) AS return_interval_days
        FROM user_visits
      )
      SELECT 
        user_id,
        visit_count,
        visit_start,
        return_interval_days
      FROM intervals
      WHERE return_interval_days IS NOT NULL
        AND return_interval_days > 0
      ORDER BY user_id, visit_count ASC
    `;

    const returnIntervalResult = await queryWithMemoryLimit(returnIntervalQuery, {
      queryMode: 'exploratory',
      format: 'JSONEachRow',
    });

    const returnIntervalJson = await returnIntervalResult.json() as {
      user_id: string;
      visit_count: number;
      visit_start: string;
      return_interval_days: number;
    }[];

    const intervalBuckets = [
      { label: 'Same day', min: 0, max: 0, users: 0 },
      { label: '1-3 days', min: 1, max: 3, users: 0 },
      { label: '4-7 days', min: 4, max: 7, users: 0 },
      { label: '8-14 days', min: 8, max: 14, users: 0 },
      { label: '15-30 days', min: 15, max: 30, users: 0 },
      { label: '31+ days', min: 31, max: Infinity, users: 0 },
    ];

    returnIntervalJson.forEach((row) => {
      const daysDiff = row.return_interval_days;

      for (const bucket of intervalBuckets) {
        if (daysDiff >= bucket.min && daysDiff <= bucket.max) {
          bucket.users++;
          break;
        }
      }
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

