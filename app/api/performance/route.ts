import { NextRequest, NextResponse } from 'next/server';
import clickhouse from '@/lib/clickhouse';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0];
    const campaignId = searchParams.get('campaign_id');
    const courseId = searchParams.get('course_id');

    // Build where conditions
    let whereConditions = `timestamp >= '${startDate} 00:00:00' AND timestamp <= '${endDate} 23:59:59'`;
    if (campaignId) {
      whereConditions += ` AND campaign_id = ${parseInt(campaignId)}`;
    }
    if (courseId) {
      whereConditions += ` AND course_id = ${parseInt(courseId)}`;
    }

    try {
      // Summary metrics
      const summaryQuery = await clickhouse.query({
        query: `
          SELECT 
            count(*) as total_visits,
            count(DISTINCT user_id) as unique_visitors,
            countIf(event_type = 'conversion') as total_conversions,
            avg(time_on_page) as avg_time_on_page,
            countIf(is_new_visitor = 1) as new_visitors
          FROM visit_logs
          WHERE ${whereConditions}
        `,
        format: 'JSONEachRow'
      });

    const summaryResult = await summaryQuery.json() as any[];
    const summary = summaryResult[0] || {
      total_visits: 0,
      unique_visitors: 0,
      total_conversions: 0,
      avg_time_on_page: 0,
      new_visitors: 0
    };

    // Calculate derived metrics
    const conversionRate = summary.total_visits > 0 
      ? ((summary.total_conversions / summary.total_visits) * 100).toFixed(2)
      : '0.00';
    
    const ctr = summary.total_visits > 0 
      ? ((summary.unique_visitors / summary.total_visits) * 100).toFixed(2)
      : '0.00';

    // For demo: use placeholder values for cost-related metrics
    const totalCost = 1500000; // Demo value
    const cpa = summary.total_conversions > 0 
      ? (totalCost / summary.total_conversions).toFixed(0)
      : '0';

    // Daily trend data
    const dailyTrendQuery = await clickhouse.query({
      query: `
        SELECT 
          toDate(timestamp) as date,
          count(*) as visits,
          count(DISTINCT user_id) as unique_visitors,
          countIf(event_type = 'conversion') as conversions,
          avg(time_on_page) as avg_time
        FROM visit_logs
        WHERE ${whereConditions}
        GROUP BY date
        ORDER BY date ASC
      `,
      format: 'JSONEachRow'
    });

    const dailyTrend = await dailyTrendQuery.json() as any[];

    // Source performance data
    const sourcePerformanceQuery = await clickhouse.query({
      query: `
        SELECT 
          utm_source as source,
          count(*) as visits,
          count(DISTINCT user_id) as unique_visitors,
          countIf(event_type = 'conversion') as conversions,
          avg(time_on_page) as avg_time
        FROM visit_logs
        WHERE ${whereConditions} AND utm_source != ''
        GROUP BY source
        ORDER BY visits DESC
        LIMIT 10
      `,
      format: 'JSONEachRow'
    });

    const sourcePerformance = await sourcePerformanceQuery.json() as any[];

    // Add demo cost data to source performance
    const sourcePerformanceWithCost = sourcePerformance.map((source: any, index: number) => {
      const demoCost = (index + 1) * 200000; // Demo values
      return {
        ...source,
        cost: demoCost,
        cpa: source.conversions > 0 ? (demoCost / source.conversions).toFixed(0) : '0',
        conversion_rate: source.visits > 0 ? ((source.conversions / source.visits) * 100).toFixed(2) : '0.00'
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total_visits: parseInt(summary.total_visits),
          unique_visitors: parseInt(summary.unique_visitors),
          total_conversions: parseInt(summary.total_conversions),
          conversion_rate: parseFloat(conversionRate),
          ctr: parseFloat(ctr),
          avg_cpa: parseInt(cpa),
          total_cost: totalCost,
          avg_time_on_page: Math.round(summary.avg_time_on_page),
          new_visitors: parseInt(summary.new_visitors)
        },
        daily_trend: dailyTrend.map((day: any) => ({
          date: day.date,
          visits: parseInt(day.visits),
          unique_visitors: parseInt(day.unique_visitors),
          conversions: parseInt(day.conversions),
          avg_time: Math.round(day.avg_time),
          // Demo cost data
          cost: Math.floor(Math.random() * 100000) + 50000
        })),
        source_performance: sourcePerformanceWithCost
      }
    });
    } catch (chError: any) {
      // Check if table doesn't exist
      if (chError.code === '60' || chError.type === 'UNKNOWN_TABLE' ||
          (chError.message && chError.message.includes('visit_logs'))) {
        console.warn('⚠️ Visit logs table does not exist yet');
        return NextResponse.json({
          success: true,
          data: {
            summary: {
              total_visits: 0,
              unique_visitors: 0,
              total_conversions: 0,
              conversion_rate: 0,
              ctr: 0,
              avg_cpa: 0,
              total_cost: 0,
              avg_time_on_page: 0,
              new_visitors: 0
            },
            daily_trend: [],
            source_performance: []
          },
          message: 'No performance data available yet. Start tracking to see analytics.'
        });
      }
      throw chError;
    }
  } catch (error) {
    console.error('Error fetching performance data:', error);
    return NextResponse.json(
      { 
        success: true, 
        data: {
          summary: {
            total_visits: 0,
            unique_visitors: 0,
            total_conversions: 0,
            conversion_rate: 0,
            ctr: 0,
            avg_cpa: 0,
            total_cost: 0,
            avg_time_on_page: 0,
            new_visitors: 0
          },
          daily_trend: [],
          source_performance: []
        },
        message: 'Unable to fetch performance data. Please try again later.'
      },
      { status: 200 }
    );
  }
}

