import { NextRequest, NextResponse } from 'next/server';
import clickhouse, { queryWithMemoryLimit } from '@/lib/clickhouse';
import { requirePermission, type AuthContext } from '@/lib/auth/api-middleware';
import { getDefaultTimezone } from '@/lib/system-settings';
import { getCache, setCache } from '@/lib/cache/cache';

/**
 * Returning Visitor Analysis API
 * 
 * Provides detailed analytics on visitor return behavior:
 * - New vs Returning visitor comparison (GA4 logic)
 * - Visit frequency distribution (counts distinct visits per user within date range)
 * - Return interval analysis (measures time between consecutive visits using visit_count)
 * - Daily trends
 * 
 * Version: 3.0 - GA4 Alignment
 * 
 * GA4 Logic for New vs Returning:
 * - New Users: Users whose first-ever session date falls within the selected date range
 * - Returning Users: Users whose first-ever session date is before the date range AND they have sessions in the range
 * - Key: If a user's first session is in the range, all their visits in that range count as "new"
 * 
 * Implementation:
 * - Finds each user's first-ever session date globally (MIN timestamp - GA4 approach)
 * - Classifies users by comparing that first session date to the selected date range
 * - Aggregates metrics (pageviews, conversions, time on page) per classification
 * - Daily trends use the same classification logic for consistency
 * - Uses MIN(timestamp) globally instead of filtering by is_new_visitor flag for robustness
 */

// Type definitions for the analytics data
interface VisitorData {
  is_new_visitor: number;
  visitors: number;
  pageviews: number;
  conversions: number;
  avg_time_on_page: number;
}

interface NewVsReturningData {
  new: {
    visitors: number;
    pageviews: number;
    conversions: number;
    conversionRate: string;
    avgTimeOnPage: number;
    percentage: string;
  };
  returning: {
    visitors: number;
    pageviews: number;
    conversions: number;
    conversionRate: string;
    avgTimeOnPage: number;
    percentage: string;
  };
}

interface FrequencyBucket {
  label: string;
  min: number;
  max: number;
  users: number;
}

interface IntervalBucket {
  label: string;
  min: number;
  max: number;
  users: number;
}

interface DailyTrendData {
  date: string;
  newVisitors: number;
  returningVisitors: number;
}

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

    console.log(`🔄 Returning Analysis API - Date Range: ${startDate} to ${endDate}, Timezone: ${timezone}`);

    // Check cache (2 minutes TTL)
    const cacheTtlMs = 120_000; // 2 minutes
    const cacheKey = `returning-analysis:${startDate}:${endDate}:${timezone}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Build WHERE clause for date filtering (always apply date filtering for memory safety)
    const whereClause = `toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${startDate}') AND toDate(toTimeZone(timestamp, '${timezone}')) <= toDate('${endDate}')`;

    // 1. New vs Returning Visitors
    // GA4 Logic:
    // - New User: First-ever session date falls within the selected date range
    // - Returning User: First-ever session date is before the date range AND user has sessions in the range
    // Key: If first session is in range, all visits in that range count as "new"

    // First, get total visitors (to match performance dashboard)
    const totalVisitorsQuery = `
      SELECT uniqExact(user_id) as total_visitors
      FROM analytics.visit_logs_buffer
      WHERE ${whereClause}
    `;

    const totalVisitorsResult = await queryWithMemoryLimit(totalVisitorsQuery, {
      format: 'JSONEachRow',
    });

    const totalVisitorsJson = await totalVisitorsResult.json() as Array<{ total_visitors: number }>;
    const totalVisitors = totalVisitorsJson[0]?.total_visitors || 0;

    // Now get new vs returning breakdown using GA4 logic
    // OPTIMIZED: Push aggregation upward, eliminate heavy intermediate GROUP BY user_id
    // Step 1: Find each user's first-ever session date (unavoidable - needed for classification)
    // Step 2: Tag rows with visitor_type and aggregate directly at that level (only 2 groups!)
    // Memory scales with rows scanned, not users grouped
    const newVsReturningQuery = `
      WITH user_first_sessions AS (
          SELECT 
            user_id,
            toDate(MIN(timestamp)) as first_session_date
        FROM analytics.visit_logs_buffer
        WHERE toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${startDate}') - INTERVAL 365 DAY
          AND toDate(toTimeZone(timestamp, '${timezone}')) <= toDate('${endDate}')
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

    const newVisitors: VisitorData = {
      is_new_visitor: 1,
      visitors: newVisitorsData.visitors,
      pageviews: newVisitorsData.pageviews,
      conversions: newVisitorsData.conversions,
      avg_time_on_page: newVisitorsData.avg_time_on_page
    };

    const returningVisitors: VisitorData = {
      is_new_visitor: 0,
      visitors: returningVisitorsData.visitors,
      pageviews: returningVisitorsData.pageviews,
      conversions: returningVisitorsData.conversions,
      avg_time_on_page: returningVisitorsData.avg_time_on_page
    };

    const newVsReturning: NewVsReturningData = {
      new: {
        visitors: newVisitors.visitors,
        pageviews: newVisitors.pageviews,
        conversions: newVisitors.conversions,
        conversionRate: newVisitors.visitors > 0
          ? ((newVisitors.conversions / newVisitors.visitors) * 100).toFixed(2)
          : '0.00',
        avgTimeOnPage: Math.round(newVisitors.avg_time_on_page),
        percentage: totalVisitors > 0
          ? ((newVisitors.visitors / totalVisitors) * 100).toFixed(1)
          : '0.0',
      },
      returning: {
        visitors: returningVisitors.visitors,
        pageviews: returningVisitors.pageviews,
        conversions: returningVisitors.conversions,
        conversionRate: returningVisitors.visitors > 0
          ? ((returningVisitors.conversions / returningVisitors.visitors) * 100).toFixed(2)
          : '0.00',
        avgTimeOnPage: Math.round(returningVisitors.avg_time_on_page),
        percentage: totalVisitors > 0
          ? ((returningVisitors.visitors / totalVisitors) * 100).toFixed(1)
          : '0.0',
      },
    };

    // 2. Visit Frequency Distribution
    // Count distinct visits per user within the date range (not lifetime visit_count)
    // Two-phase pattern: Per-user aggregation is necessary to calculate frequency distribution
    // First phase: Get visit count per user (necessary - can't avoid this)
    // Second phase: Group by visit count to build histogram (low cardinality - < 100 groups)
    const visitFrequencyQuery = `
      WITH per_user_visits AS (
        SELECT 
          user_id,
          uniqExact(visit_count) AS visits_in_range
        FROM analytics.visit_logs_buffer
        WHERE ${whereClause}
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

    // Group visit counts: 1, 2-5, 6-10, 11-20, 21+
    const frequencyBuckets: FrequencyBucket[] = [
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

    // 3. Return Interval Analysis (days between consecutive visits)
    // Calculate intervals between consecutive visits per user using window functions
    // High-cardinality output (one row per user visit) - use exploratory mode
    // Note: Window functions can't be used in WHERE, so we need to wrap in CTE
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

    // High-cardinality query: One row per user visit (exploratory analysis)
    // Use exploratory mode to prevent memory explosion
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

    // Intervals are now calculated in SQL using window functions
    // Process intervals into buckets and calculate average
    let totalIntervals = 0;
    let intervalSum = 0;

    const intervalBuckets: IntervalBucket[] = [
      { label: 'Same day', min: 0, max: 0, users: 0 },
      { label: '1-3 days', min: 1, max: 3, users: 0 },
      { label: '4-7 days', min: 4, max: 7, users: 0 },
      { label: '8-14 days', min: 8, max: 14, users: 0 },
      { label: '15-30 days', min: 15, max: 30, users: 0 },
      { label: '31+ days', min: 31, max: Infinity, users: 0 },
    ];

    // Process SQL-calculated intervals
    returnIntervalJson.forEach((row) => {
      const daysDiff = row.return_interval_days;

        totalIntervals++;
        intervalSum += daysDiff;

        // Find appropriate bucket
        for (const bucket of intervalBuckets) {
          if (daysDiff >= bucket.min && daysDiff <= bucket.max) {
            bucket.users++;
            break;
        }
      }
    });

    const avgReturnInterval = totalIntervals > 0 ? Math.round(intervalSum / totalIntervals) : 0;

    // 4. Daily new vs returning trend
    // OPTIMIZED: Push aggregation upward, eliminate heavy intermediate per-user grouping
    // GA4 Logic: Classify users based on their first-ever session date, then aggregate by date
    const dailyTrendQuery = `
      WITH user_first_sessions AS (
          SELECT 
            user_id,
            toDate(MIN(timestamp)) as first_session_date
        FROM analytics.visit_logs_buffer
        WHERE toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${startDate}') - INTERVAL 365 DAY
          AND toDate(toTimeZone(timestamp, '${timezone}')) <= toDate('${endDate}')
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
    const dailyTrend: DailyTrendData[] = dailyTrendJson.map((row) => ({
      date: row.date,
      newVisitors: row.new_visitors,
      returningVisitors: row.returning_visitors,
    }));

    const response = {
      success: true,
      newVsReturning,
      visitFrequency: frequencyBuckets,
      returnIntervals: intervalBuckets,
      insights: {
        avgReturnInterval,
        totalReturningUsers: returningVisitors.visitors,
      },
      dailyTrend,
    };

    await setCache(cacheKey, response, cacheTtlMs);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Returning visitor analysis API error:', error);
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
// 