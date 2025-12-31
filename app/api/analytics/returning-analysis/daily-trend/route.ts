import { NextRequest, NextResponse } from 'next/server';
import { queryWithMemoryLimit } from '@/lib/clickhouse';
import { requirePermission, type AuthContext } from '@/lib/auth/api-middleware';
import { getDefaultTimezone } from '@/lib/system-settings';
import { getCache, setCache } from '@/lib/cache/cache';
import { resolveAnalyticsDates } from '@/lib/utils/kst-date';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('analytics:read', async (request: NextRequest, context: AuthContext) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const MAX_RANGE_DAYS = 90;
    const sectionName = 'daily-trend';

    const { startDate, endDate } = resolveAnalyticsDates(searchParams, {
      defaultRangeDays: 30,
      maxRangeDays: MAX_RANGE_DAYS
    });

    const timezone = await getDefaultTimezone();

    console.log('daily-trend');

    const cacheTtlMs = 30_000;
    const cacheKey = `returning-analysis-${sectionName}:${startDate}:${endDate}:${timezone}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const whereClause = `created_date_kst >= toDate('${startDate}') AND created_date_kst <= toDate('${endDate}')`;

    const dailyTrendQuery = `
      WITH user_first_sessions AS (
          SELECT 
            user_id,
            toDate(MIN(toTimeZone(timestamp, '${timezone}'))) as first_session_date
        FROM analytics.visit_logs_buffer
        WHERE created_date_kst >= toDate('${startDate}') - INTERVAL 365 DAY
          AND created_date_kst <= toDate('${endDate}')
          AND utm_source != ''
          GROUP BY user_id
      )
      SELECT 
        toDate(toTimeZone(vl.timestamp, '${timezone}')) as date,
        uniqExactIf(vl.user_id, 
          ufs.first_session_date >= toDate('${startDate}') 
          AND ufs.first_session_date <= toDate('${endDate}')
        ) as new_visitors,
        uniqExactIf(vl.user_id,
          ufs.first_session_date < toDate('${startDate}')
        ) as returning_visitors
      FROM analytics.visit_logs_buffer vl
      INNER JOIN user_first_sessions ufs ON vl.user_id = ufs.user_id
        WHERE ${whereClause}
          AND vl.utm_source != ''
      GROUP BY date
      ORDER BY date ASC
    `;

    const dailyTrendResult = await queryWithMemoryLimit(dailyTrendQuery, {
      format: 'JSONEachRow',
    });

    const dailyTrendJson = await dailyTrendResult.json() as {
      date: string;
      new_visitors: number;
      returning_visitors: number
    }[];

    const dailyTrend = dailyTrendJson.map((row) => ({
      date: row.date,
      newVisitors: row.new_visitors,
      returningVisitors: row.returning_visitors,
    }));

    const response = {
      success: true,
      dailyTrend,
    };

    await setCache(cacheKey, response, cacheTtlMs);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Returning analysis daily-trend API error:', error);
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

