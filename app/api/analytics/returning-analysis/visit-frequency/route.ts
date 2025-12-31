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
    const sectionName = 'visit-frequency';

    const { startDate, endDate } = resolveAnalyticsDates(searchParams, {
      defaultRangeDays: 30,
      maxRangeDays: MAX_RANGE_DAYS
    });

    const timezone = await getDefaultTimezone();

    console.log('visit-frequency');

    const cacheTtlMs = 30_000;
    const cacheKey = `returning-analysis-${sectionName}:${startDate}:${endDate}:${timezone}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const whereClause = `created_date_kst >= toDate('${startDate}') AND created_date_kst <= toDate('${endDate}')`;

    const visitFrequencyQuery = `
      WITH per_user_visits AS (
        SELECT 
          user_id,
          uniqExact(visit_count) AS visits_in_range
        FROM analytics.visit_logs_buffer
        WHERE ${whereClause}
          AND utm_source != ''
        GROUP BY user_id
      )
      SELECT
        visits_in_range,
        COUNT(*) AS users
      FROM per_user_visits
      GROUP BY visits_in_range
      ORDER BY visits_in_range ASC
    `;

    const visitFrequencyResult = await queryWithMemoryLimit(visitFrequencyQuery, {
      format: 'JSONEachRow',
    });

    const visitFrequencyJson = await visitFrequencyResult.json() as { visits_in_range: number; users: number }[];

    const frequencyBuckets = [
      { label: '1 visit', min: 1, max: 1, users: 0 },
      { label: '2-5 visits', min: 2, max: 5, users: 0 },
      { label: '6-10 visits', min: 6, max: 10, users: 0 },
      { label: '11-20 visits', min: 11, max: 20, users: 0 },
      { label: '21+ visits', min: 21, max: Infinity, users: 0 },
    ];

    visitFrequencyJson.forEach((row) => {
      const count = row.visits_in_range;
      const users = row.users;

      for (const bucket of frequencyBuckets) {
        if (count >= bucket.min && count <= bucket.max) {
          bucket.users += users;
          break;
        }
      }
    });

    const response = {
      success: true,
      visitFrequency: frequencyBuckets,
    };

    await setCache(cacheKey, response, cacheTtlMs);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Returning analysis visit-frequency API error:', error);
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

