import { NextRequest, NextResponse } from 'next/server';
import clickhouse from '@/lib/clickhouse';

/**
 * Returning Visitor Analysis API
 * 
 * Provides detailed analytics on visitor return behavior:
 * - New vs Returning visitor comparison
 * - Visit frequency distribution (uses MAX visit_count per user to avoid double-counting)
 * - Return interval analysis (measures time between consecutive sessions)
 * - Daily trends
 * 
 * Version: 2.0
 * Fixed Issues:
 * - Visit frequency now uses MAX(visit_count) per user instead of grouping all pageviews
 * - Return intervals now measure consecutive session gaps instead of first-to-last span
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

    // Build WHERE clause for date filtering
    let whereClause = '1=1';

    if (startDate) {
      whereClause += ` AND toDate(timestamp) >= '${startDate}'`;
    }
    if (endDate) {
      whereClause += ` AND toDate(timestamp) <= '${endDate}'`;
    }

    // 1. New vs Returning Visitors
    const newVsReturningQuery = `
      SELECT 
        is_new_visitor,
        COUNT(DISTINCT user_id) as visitors,
        COUNT(*) as pageviews,
        countIf(event_type = 'conversion') as conversions,
        AVG(time_on_page) as avg_time_on_page
      FROM analytics.visit_logs
      WHERE ${whereClause}
      GROUP BY is_new_visitor
    `;

    const newVsReturningResult = await clickhouse.query({
      query: newVsReturningQuery,
      format: 'JSONEachRow',
    });

    const newVsReturningJson = await newVsReturningResult.json() as VisitorData[];
    
    const newVisitors: VisitorData = newVsReturningJson.find((row: VisitorData) => row.is_new_visitor === 1) || {
      is_new_visitor: 1,
      visitors: 0, 
      pageviews: 0, 
      conversions: 0, 
      avg_time_on_page: 0
    };
    const returningVisitors: VisitorData = newVsReturningJson.find((row: VisitorData) => row.is_new_visitor === 0) || {
      is_new_visitor: 0,
      visitors: 0, 
      pageviews: 0, 
      conversions: 0, 
      avg_time_on_page: 0
    };

    const totalVisitors = newVisitors.visitors + returningVisitors.visitors;

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
    // Get the maximum visit_count per user to avoid double-counting
    const visitFrequencyQuery = `
      SELECT 
        max_visit_count,
        COUNT(*) as users
      FROM (
        SELECT 
          user_id,
          MAX(visit_count) as max_visit_count
        FROM analytics.visit_logs
        WHERE ${whereClause}
        GROUP BY user_id
      )
      GROUP BY max_visit_count
      ORDER BY max_visit_count ASC
    `;

    const visitFrequencyResult = await clickhouse.query({
      query: visitFrequencyQuery,
      format: 'JSONEachRow',
    });

    const visitFrequencyJson = await visitFrequencyResult.json() as { max_visit_count: number; users: number }[];
    
    // Group visit counts: 1, 2-5, 6-10, 11-20, 21+
    const frequencyBuckets: FrequencyBucket[] = [
      { label: '1 visit', min: 1, max: 1, users: 0 },
      { label: '2-5 visits', min: 2, max: 5, users: 0 },
      { label: '6-10 visits', min: 6, max: 10, users: 0 },
      { label: '11-20 visits', min: 11, max: 20, users: 0 },
      { label: '21+ visits', min: 21, max: Infinity, users: 0 },
    ];

    visitFrequencyJson.forEach((row) => {
      const count = row.max_visit_count;
      const users = row.users;
      
      for (const bucket of frequencyBuckets) {
        if (count >= bucket.min && count <= bucket.max) {
          bucket.users += users;
          break;
        }
      }
    });

    // 3. Return Interval Analysis (days between consecutive visits)
    // Calculate intervals between consecutive sessions per user
    const returnIntervalQuery = `
      SELECT 
        user_id,
        session_id,
        MIN(timestamp) as session_start
      FROM analytics.visit_logs
      WHERE ${whereClause}
        AND is_new_visitor = 0
      GROUP BY user_id, session_id
      ORDER BY user_id, session_start
    `;

    const returnIntervalResult = await clickhouse.query({
      query: returnIntervalQuery,
      format: 'JSONEachRow',
    });

    const returnIntervalJson = await returnIntervalResult.json() as { 
      user_id: string; 
      session_id: string;
      session_start: string; 
    }[];
    
    // Calculate intervals between consecutive sessions
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

    // Group sessions by user
    const userSessions = new Map<string, Date[]>();
    returnIntervalJson.forEach((row) => {
      if (!userSessions.has(row.user_id)) {
        userSessions.set(row.user_id, []);
      }
      userSessions.get(row.user_id)!.push(new Date(row.session_start));
    });

    // Calculate intervals between consecutive sessions for each user
    userSessions.forEach((sessions, userId) => {
      // Sort sessions by time
      sessions.sort((a, b) => a.getTime() - b.getTime());
      
      // Calculate intervals between consecutive sessions
      for (let i = 1; i < sessions.length; i++) {
        const prevSession = sessions[i - 1];
        const currentSession = sessions[i];
        const daysDiff = Math.floor((currentSession.getTime() - prevSession.getTime()) / (1000 * 60 * 60 * 24));
        
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
    const dailyTrendQuery = `
      SELECT 
        toDate(timestamp) as date,
        countDistinctIf(user_id, is_new_visitor = 1) as new_visitors,
        countDistinctIf(user_id, is_new_visitor = 0) as returning_visitors
      FROM analytics.visit_logs
      WHERE ${whereClause}
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
