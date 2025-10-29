import { NextRequest, NextResponse } from 'next/server';
import clickhouse from '@/lib/clickhouse';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    const campaignId = searchParams.get('campaignId');

    // Build WHERE clause
    const whereConditions = [`toDate(timestamp) BETWEEN toDate('${startDate}') AND toDate('${endDate}')`];
    whereConditions.push(`event_type = 'conversion'`);
    
    if (campaignId && campaignId !== 'all') {
      whereConditions.push(`campaign_id = ${campaignId}`);
    }
    
    const whereClause = whereConditions.join(' AND ');

    // Get conversion summary by type
    const conversionSummaryQuery = `
      SELECT 
        conversion_type,
        COUNT(*) as count,
        SUM(conversion_value) as total_value,
        AVG(conversion_value) as avg_value,
        COUNT(DISTINCT user_id) as unique_users
      FROM visit_logs
      WHERE ${whereClause}
        AND conversion_type != ''
      GROUP BY conversion_type
      ORDER BY count DESC
    `;

    const summaryResult = await clickhouse.query({
      query: conversionSummaryQuery,
      format: 'JSONEachRow'
    });

    const summaryData = await summaryResult.json();

    // Get conversion trend over time
    const conversionTrendQuery = `
      SELECT 
        toDate(timestamp) as date,
        conversion_type,
        COUNT(*) as count,
        SUM(conversion_value) as total_value
      FROM visit_logs
      WHERE ${whereClause}
        AND conversion_type != ''
      GROUP BY date, conversion_type
      ORDER BY date ASC, conversion_type
    `;

    const trendResult = await clickhouse.query({
      query: conversionTrendQuery,
      format: 'JSONEachRow'
    });

    const trendData = await trendResult.json();

    // Get conversion by source/medium
    const conversionBySourceQuery = `
      SELECT 
        utm_source,
        utm_medium,
        conversion_type,
        COUNT(*) as count,
        SUM(conversion_value) as total_value
      FROM visit_logs
      WHERE ${whereClause}
        AND conversion_type != ''
        AND utm_source != ''
      GROUP BY utm_source, utm_medium, conversion_type
      ORDER BY count DESC
      LIMIT 20
    `;

    const sourceResult = await clickhouse.query({
      query: conversionBySourceQuery,
      format: 'JSONEachRow'
    });

    const sourceData = await sourceResult.json();

    // Get conversion funnel (total visitors vs conversions)
    const funnelQuery = `
      SELECT 
        COUNT(DISTINCT user_id) as total_visitors,
        countIf(event_type = 'conversion') as total_conversions,
        countIf(event_type = 'conversion' AND conversion_type = 'signup') as signup_conversions,
        countIf(event_type = 'conversion' AND conversion_type = 'purchase') as purchase_conversions,
        countIf(event_type = 'conversion' AND conversion_type = 'trial_start') as trial_conversions,
        SUM(CASE WHEN event_type = 'conversion' THEN conversion_value ELSE 0 END) as total_revenue
      FROM visit_logs
      WHERE toDate(timestamp) BETWEEN toDate('${startDate}') AND toDate('${endDate}')
      ${campaignId && campaignId !== 'all' ? `AND campaign_id = ${campaignId}` : ''}
    `;

    const funnelResult = await clickhouse.query({
      query: funnelQuery,
      format: 'JSONEachRow'
    });

    const funnelData = await funnelResult.json();

    return NextResponse.json({
      success: true,
      data: {
        summary: summaryData,
        trend: trendData,
        bySource: sourceData,
        funnel: funnelData[0] || {}
      }
    });

  } catch (error) {
    console.error('Conversion analysis error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch conversion analytics' },
      { status: 500 }
    );
  }
}

