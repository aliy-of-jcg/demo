import { NextRequest, NextResponse } from 'next/server';
import clickhouse from '@/lib/clickhouse';
import { getPool } from '@/lib/mysql';
import { RowDataPacket } from 'mysql2';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const campaignId = searchParams.get('campaign_id');
    const platform = searchParams.get('platform'); // Filter by utm_medium
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    
    console.log(`📊 Campaign Analysis API - Campaign ID: ${campaignId}, Date Range: ${startDate || 'default'} to ${endDate || 'default'}`);

    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: 'campaign_id is required' },
        { status: 400 }
      );
    }

    const pool = getPool();

    // 1. Get campaign details
    const [campaignRows] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, co.name as course_name 
       FROM campaigns c 
       LEFT JOIN courses co ON c.course_id = co.id 
       WHERE c.id = ?`,
      [campaignId]
    );

    if (campaignRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const campaign = campaignRows[0];

    // 2. Get all tracking codes for this campaign
    const [trackingCodes] = await pool.query<RowDataPacket[]>(
      'SELECT utm_campaign, utm_source, utm_medium FROM utm_codes WHERE campaign_id = ?',
      [campaignId]
    );

    if (trackingCodes.length === 0) {
      return NextResponse.json({
        success: true,
        campaign: {
          id: campaign.id,
          name: campaign.name,
          course_name: campaign.course_name,
          budget: parseFloat(campaign.budget) || 0,
          spent: parseFloat(campaign.spent) || 0,
        },
        platforms: [],
        metrics: {
          visitors: 0,
          conversions: 0,
          conversionRate: '0.00',
          clicks: 0,
          ctr: '0.00',
          revenue: 0,
          cpa: 0,
        },
        dailyData: [],
      });
    }

    // 3. Extract unique platforms and build filter
    const allPlatforms = Array.from(new Set(trackingCodes.map(tc => tc.utm_medium || tc.utm_source))).filter(Boolean);
    const utmCampaigns = Array.from(new Set(trackingCodes.map(tc => tc.utm_campaign))).filter(Boolean);

    // Build WHERE clause without parameterized IN
    const utmCampaignsList = utmCampaigns.map(c => `'${c.replace(/'/g, "\\'")}'`).join(',');
    let whereClause = `utm_campaign IN (${utmCampaignsList})`;

    if (startDate) {
      whereClause += ` AND toDate(timestamp) >= '${startDate}'`;
    }
    if (endDate) {
      whereClause += ` AND toDate(timestamp) <= '${endDate}'`;
    }

    // Platform filter (utm_medium or utm_source)
    if (platform && platform !== 'all') {
      const escapedPlatform = platform.replace(/'/g, "\\'");
      whereClause += ` AND (utm_medium = '${escapedPlatform}' OR utm_source = '${escapedPlatform}')`;
    }

    // 4. Get visitor and conversion metrics from visit_logs
    const visitMetricsQuery = `
      SELECT 
        COUNT(DISTINCT user_id) as unique_visitors,
        countIf(event_type = 'conversion') as conversions
      FROM analytics.visit_logs
      WHERE ${whereClause}
    `;

    const visitResult = await clickhouse.query({
      query: visitMetricsQuery,
      format: 'JSONEachRow',
    });

    const visitData = await visitResult.json() as Array<{ unique_visitors: number; conversions: number }>;
    const visitors = visitData[0]?.unique_visitors || 0;
    const conversions = visitData[0]?.conversions || 0;
    const conversionRate = visitors > 0 ? ((conversions / visitors) * 100).toFixed(2) : '0.00';

    // 5. Get click metrics from tracking_events
    const trackingCodesList = trackingCodes.map(tc => {
      const code = [tc.utm_source, tc.utm_medium, tc.utm_campaign].filter(Boolean).join('_');
      return `'${code.replace(/'/g, "\\'")}'`;
    }).join(',');

    let clickWhereClause = `tracking_code IN (${trackingCodesList})`;
    if (startDate) {
      clickWhereClause += ` AND toDate(timestamp) >= '${startDate}'`;
    }
    if (endDate) {
      clickWhereClause += ` AND toDate(timestamp) <= '${endDate}'`;
    }

    const clickQuery = `
      SELECT COUNT(*) as total_clicks
      FROM tracking_events
      WHERE ${clickWhereClause}
    `;

    const clickResult = await clickhouse.query({
      query: clickQuery,
      format: 'JSONEachRow',
    });

    const clickData = await clickResult.json() as Array<{ total_clicks: number }>;
    const clicks = clickData[0]?.total_clicks || 0;
    const ctr = visitors > 0 ? ((clicks / visitors) * 100).toFixed(2) : '0.00';

    // 6. Calculate revenue and CPA (using budget as revenue proxy)
    const revenue = parseFloat(campaign.budget) || 0;
    const cpa = conversions > 0 ? Math.round(revenue / conversions) : 0;

    // 7. Get daily performance data
    const dailyQuery = `
      SELECT 
        toDate(timestamp) as date,
        COUNT(DISTINCT user_id) as visitors,
        countIf(event_type = 'conversion') as conversions
      FROM analytics.visit_logs
      WHERE ${whereClause}
      GROUP BY date
      ORDER BY date ASC
    `;

    const dailyResult = await clickhouse.query({
      query: dailyQuery,
      format: 'JSONEachRow',
    });

    const dailyJson = await dailyResult.json();
    const dailyData = dailyJson.map((row: any) => ({
      date: row.date,
      visitors: row.visitors,
      conversions: row.conversions,
      conversionRate: row.visitors > 0 ? ((row.conversions / row.visitors) * 100).toFixed(2) : '0.00',
      // Estimate daily cost based on total spent
      cost: conversions > 0 ? Math.round((parseFloat(campaign.spent) || 0) * (row.conversions / conversions)) : 0,
    }));

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        course_name: campaign.course_name,
        budget: parseFloat(campaign.budget) || 0,
        spent: parseFloat(campaign.spent) || 0,
      },
      platforms: allPlatforms,
      metrics: {
        visitors,
        conversions,
        conversionRate,
        clicks,
        ctr,
        revenue,
        cpa,
      },
      dailyData,
    });

  } catch (error) {
    console.error('Campaign analysis API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
