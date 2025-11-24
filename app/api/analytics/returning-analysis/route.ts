import { NextRequest, NextResponse } from 'next/server';
import clickhouse from '@/lib/clickhouse';

/**
 * Returning Visitor Analysis API
 * 
 * Provides detailed analytics on visitor return behavior:
 * - New vs Returning visitor comparison
 * - Visit frequency distribution (counts distinct visits per user within date range, matches Google Analytics)
 * - Return interval analysis (measures time between consecutive visits using visit_count)
 * - Daily trends
 * 
 * Version: 2.3
 * Fixed Issues:
 * - New vs Returning visitors now correctly classify each user as either "new" OR "returning" (not both)
 *   Users with any visit having is_new_visitor = 1 are classified as "new", others as "returning"
 *   This ensures new + returning = total visitors, matching performance dashboard totals
 * - Visit frequency now counts distinct visit_count per user within the selected date range
 *   (not lifetime visit_count), matching Google Analytics behavior of showing visits in the period
 * - Return intervals now measure consecutive visit gaps (by visit_count) instead of session gaps
 *   This ensures accurate intervals by counting actual return visits, not multiple sessions within the same visit
 * - Daily trends now correctly classify users as either new OR returning per day (not both)
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
    // Fixed: Classify each user as either "new" OR "returning" (not both)
    // If a user has ANY visit with is_new_visitor = 1, they're classified as "new"
    // Otherwise, they're classified as "returning"
    // This ensures each user is counted only once and matches the performance dashboard total
    
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

    // Now get new vs returning breakdown - classify users first, then aggregate
    // Classify each user based on max(is_new_visitor): if any visit = 1, user is "new", else "returning"
    const newVsReturningQuery = `
      SELECT 
        if(max_user_is_new = 1, 'new', 'returning') as visitor_type,
        uniqExact(vl.user_id) as visitors,
        COUNT(*) as pageviews,
        countIf(event_type = 'conversion') as conversions,
        AVG(time_on_page) as avg_time_on_page
      FROM analytics.visit_logs vl
      INNER JOIN (
        SELECT 
          user_id,
          max(is_new_visitor) as max_user_is_new
        FROM analytics.visit_logs
        WHERE ${whereClause}
        GROUP BY user_id
      ) user_types ON vl.user_id = user_types.user_id
      WHERE ${whereClause}
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
    // Fixed: Each user is counted only once per day (as either new or returning, not both)
    // If a user has any visit with is_new_visitor = 1 on a day, they're classified as "new" for that day
    // Otherwise, they're classified as "returning" for that day
    const dailyTrendQuery = `
      SELECT 
        date,
        countIf(visitor_type = 'new') as new_visitors,
        countIf(visitor_type = 'returning') as returning_visitors
      FROM (
        SELECT 
          toDate(toTimeZone(timestamp, 'Asia/Seoul')) as date,
          user_id,
          if(max(is_new_visitor) = 1, 'new', 'returning') as visitor_type
        FROM analytics.visit_logs
        WHERE ${whereClause}
        GROUP BY date, user_id
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
