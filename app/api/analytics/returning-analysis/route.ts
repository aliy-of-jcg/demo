import { NextRequest, NextResponse } from 'next/server';
import clickhouse from '@/lib/clickhouse';

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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    console.log(`🔄 Returning Analysis API - Date Range: ${startDate || 'default'} to ${endDate || 'default'}`);

    // Build WHERE clause for date filtering (standardized to match performance dashboard)
    let whereClause = '1=1';

    // Date filtering
    if (startDate && endDate) {
      whereClause += ` AND toDate(toTimeZone(timestamp, 'Asia/Seoul')) BETWEEN toDate('${startDate}') AND toDate('${endDate}')`;
    } else {
      if (startDate) {
        whereClause += ` AND toDate(toTimeZone(timestamp, 'Asia/Seoul')) >= toDate('${startDate}')`;
      }
      if (endDate) {
        whereClause += ` AND toDate(toTimeZone(timestamp, 'Asia/Seoul')) <= toDate('${endDate}')`;
      }
    }

    // 1. New vs Returning Visitors
    // GA4 Logic:
    // - New User: First-ever session date falls within the selected date range
    // - Returning User: First-ever session date is before the date range AND user has sessions in the range
    // Key: If first session is in range, all visits in that range count as "new"

    // First, get total visitors (to match performance dashboard)
    const totalVisitorsQuery = `
      SELECT COUNT(DISTINCT user_id) as total_visitors
      FROM analytics.visit_logs
      WHERE ${whereClause}
    `;

    const totalVisitorsResult = await clickhouse.query({
      query: totalVisitorsQuery,
      format: 'JSONEachRow',
    });

    const totalVisitorsJson = await totalVisitorsResult.json() as Array<{ total_visitors: number }>;
    const totalVisitors = totalVisitorsJson[0]?.total_visitors || 0;

    // Now get new vs returning breakdown using GA4 logic
    // Step 1: Find each user's first-ever session date (globally using MIN(timestamp))
    // Step 2: Classify based on whether that date falls within the selected range
    // Uses MIN(timestamp) globally (GA4 approach) instead of filtering by is_new_visitor flag
    const newVsReturningQuery = `
      SELECT 
        visitor_type,
        uniqExact(user_id) as visitors,
        SUM(pageviews) as pageviews,
        SUM(conversions) as conversions,
        AVG(avg_time_on_page) as avg_time_on_page
      FROM (
        SELECT 
          vl.user_id,
          if(
            first_session_date >= toDate('${startDate || '1970-01-01'}') 
            AND first_session_date <= toDate('${endDate || '2099-12-31'}'),
            'new',
            'returning'
          ) as visitor_type,
          COUNT(*) as pageviews,
          countIf(vl.event_type = 'conversion') as conversions,
          AVG(vl.time_on_page) as avg_time_on_page
        FROM analytics.visit_logs vl
        INNER JOIN (
          SELECT 
            user_id,
            toDate(MIN(timestamp)) as first_session_date
          FROM analytics.visit_logs
          GROUP BY user_id
        ) user_first_sessions ON vl.user_id = user_first_sessions.user_id
        WHERE ${whereClause}
        GROUP BY vl.user_id, visitor_type, first_session_date
      )
      GROUP BY visitor_type
    `;

    const newVsReturningResult = await clickhouse.query({
      query: newVsReturningQuery,
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
    // This matches Google Analytics behavior: shows how many times users visited in the selected period
    const visitFrequencyQuery = `
      SELECT 
        visits_in_range,
        COUNT(*) as users
      FROM (
        SELECT 
          user_id,
          uniqExact(visit_count) as visits_in_range
        FROM analytics.visit_logs
        WHERE ${whereClause}
        GROUP BY user_id
      )
      GROUP BY visits_in_range
      ORDER BY visits_in_range ASC
    `;

    const visitFrequencyResult = await clickhouse.query({
      query: visitFrequencyQuery,
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
    // Calculate intervals between consecutive visits per user (using visit_count instead of session_id)
    // This ensures we measure actual return visits, not multiple sessions within the same visit
    const returnIntervalQuery = `
      SELECT 
        user_id,
        visit_count,
        MIN(timestamp) as visit_start
      FROM analytics.visit_logs
      WHERE ${whereClause}
        AND user_id IN (
          SELECT DISTINCT user_id 
          FROM analytics.visit_logs 
          WHERE ${whereClause} AND is_new_visitor = 0
        )
      GROUP BY user_id, visit_count
      ORDER BY user_id, visit_count ASC
    `;

    const returnIntervalResult = await clickhouse.query({
      query: returnIntervalQuery,
      format: 'JSONEachRow',
    });

    const returnIntervalJson = await returnIntervalResult.json() as {
      user_id: string;
      visit_count: number;
      visit_start: string;
    }[];

    // Calculate intervals between consecutive visits
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

    // Group visits by user (each visit has a unique visit_count)
    const userVisits = new Map<string, Array<{ visit_count: number; visit_start: Date }>>();
    returnIntervalJson.forEach((row) => {
      if (!userVisits.has(row.user_id)) {
        userVisits.set(row.user_id, []);
      }
      userVisits.get(row.user_id)!.push({
        visit_count: row.visit_count,
        visit_start: new Date(row.visit_start)
      });
    });

    // Calculate intervals between consecutive visits for each user
    userVisits.forEach((visits, userId) => {
      // Sort visits by visit_count (should already be sorted, but ensure it)
      visits.sort((a, b) => a.visit_count - b.visit_count);

      // Calculate intervals between consecutive visit_counts
      for (let i = 1; i < visits.length; i++) {
        const prevVisit = visits[i - 1];
        const currentVisit = visits[i];

        // Skip if visit_count is not consecutive (shouldn't happen, but safety check)
        if (currentVisit.visit_count !== prevVisit.visit_count + 1) {
          continue;
        }

        const daysDiff = Math.floor(
          (currentVisit.visit_start.getTime() - prevVisit.visit_start.getTime())
          / (1000 * 60 * 60 * 24)
        );

        totalIntervals++;
        intervalSum += daysDiff;

        // Find appropriate bucket
        for (const bucket of intervalBuckets) {
          if (daysDiff >= bucket.min && daysDiff <= bucket.max) {
            bucket.users++;
            break;
          }
        }
      }
    });

    const avgReturnInterval = totalIntervals > 0 ? Math.round(intervalSum / totalIntervals) : 0;

    // 4. Daily new vs returning trend
    // GA4 Logic: Classify users based on their first-ever session date (globally)
    // Then count their daily activity
    // Uses MIN(timestamp) globally (GA4 approach) instead of filtering by is_new_visitor flag
    const dailyTrendQuery = `
      SELECT 
        date,
        uniqExactIf(user_id, visitor_type = 'new') as new_visitors,
        uniqExactIf(user_id, visitor_type = 'returning') as returning_visitors
      FROM (
        SELECT 
          vl.user_id,
          toDate(toTimeZone(vl.timestamp, 'Asia/Seoul')) as date,
          if(
            first_session_date >= toDate('${startDate || '1970-01-01'}') 
            AND first_session_date <= toDate('${endDate || '2099-12-31'}'),
            'new',
            'returning'
          ) as visitor_type
        FROM analytics.visit_logs vl
        INNER JOIN (
          SELECT 
            user_id,
            toDate(MIN(timestamp)) as first_session_date
          FROM analytics.visit_logs
          GROUP BY user_id
        ) user_first_sessions ON vl.user_id = user_first_sessions.user_id
        WHERE ${whereClause}
      )
      GROUP BY date
      ORDER BY date ASC
    `;

    const dailyTrendResult = await clickhouse.query({
      query: dailyTrendQuery,
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

    return NextResponse.json({
      success: true,
      newVsReturning,
      visitFrequency: frequencyBuckets,
      returnIntervals: intervalBuckets,
      insights: {
        avgReturnInterval,
        totalReturningUsers: returningVisitors.visitors,
      },
      dailyTrend,
    });

  } catch (error) {
    console.error('Returning visitor analysis API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
// 