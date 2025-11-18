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

    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: 'campaign_id is required' },
        { status: 400 }
      );
    }

    const pool = getPool();

    // 1. Get campaign details (allow hidden campaigns for historical data viewing)
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
      'SELECT tracking_code, utm_campaign, utm_source, utm_medium FROM utm_codes WHERE campaign_id = ?',
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
    
    // Build WHERE clause using tracking_code (more reliable than utm_campaign matching)
    const validTrackingCodes = trackingCodes
      .map(tc => tc.tracking_code)
      .filter(code => code && code !== '');
    
    // Get utm_campaign names for legacy data fallback
    const utmCampaigns = Array.from(new Set(trackingCodes.map(tc => tc.utm_campaign))).filter(Boolean);
    
    let whereClause: string;
    if (validTrackingCodes.length === 0) {
      // Fallback: use utm_campaign if no tracking codes available (legacy data only)
      const utmCampaignsList = utmCampaigns.map(c => `'${c.replace(/'/g, "\\'")}'`).join(',');
      whereClause = `utm_campaign IN (${utmCampaignsList})`;
    } else {
      // Primary method: use tracking_code + include legacy data with empty tracking codes
      const trackingCodesList = validTrackingCodes.map(code => `'${code.replace(/'/g, "\\'")}'`).join(',');
      const utmCampaignsList = utmCampaigns.map(c => `'${c.replace(/'/g, "\\'")}'`).join(',');
      
      // Include both: visits with valid tracking codes AND legacy visits with empty tracking codes
      whereClause = `(tracking_code IN (${trackingCodesList}) OR (tracking_code = '' AND utm_campaign IN (${utmCampaignsList})))`;
    }

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
    // Match channel-performance API approach: count distinct users per tracking_code, then sum
    // This ensures visits are counted per channel/tracking_code (same as channel-performance page)
    const visitMetricsQuery = `
      SELECT 
        tracking_code,
        COUNT(DISTINCT user_id) as unique_visitors_per_code,
        countIf(event_type = 'conversion') as conversions_per_code
      FROM analytics.visit_logs
      WHERE ${whereClause}
      GROUP BY tracking_code
    `;

    const visitResult = await clickhouse.query({
      query: visitMetricsQuery,
      format: 'JSONEachRow',
    });

    const visitData = await visitResult.json() as Array<{ tracking_code: string; unique_visitors_per_code: number; conversions_per_code: number }>;
    
    // Sum up visits and conversions across all tracking codes (matches channel-performance behavior)
    const visitors = visitData.reduce((sum, row) => sum + (row.unique_visitors_per_code || 0), 0);
    const conversions = visitData.reduce((sum, row) => sum + (row.conversions_per_code || 0), 0);
    const conversionRate = visitors > 0 ? ((conversions / visitors) * 100).toFixed(2) : '0.00';

    // 5. Get click metrics from tracking_events
    // Use actual tracking_code from database (same as visit query)
    let clickWhereClause: string;
    if (validTrackingCodes.length > 0) {
      const trackingCodesList = validTrackingCodes.map(code => `'${code.replace(/'/g, "\\'")}'`).join(',');
      clickWhereClause = `tracking_code IN (${trackingCodesList})`;
    } else {
      // Fallback: construct tracking code from UTM parameters (legacy data)
      const trackingCodesList = trackingCodes.map(tc => {
        const code = [tc.utm_source, tc.utm_medium, tc.utm_campaign].filter(Boolean).join('_');
        return `'${code.replace(/'/g, "\\'")}'`;
      }).join(',');
      clickWhereClause = `tracking_code IN (${trackingCodesList})`;
    }
    
    if (startDate) {
      clickWhereClause += ` AND toDate(timestamp) >= '${startDate}'`;
    }
    if (endDate) {
      clickWhereClause += ` AND toDate(timestamp) <= '${endDate}'`;
    }

    const clickQuery = `
      SELECT COUNT(*) as total_clicks
      FROM analytics.tracking_events
      WHERE ${clickWhereClause}
    `;

    const clickResult = await clickhouse.query({
      query: clickQuery,
      format: 'JSONEachRow',
    });

    const clickData = await clickResult.json() as Array<{ total_clicks: number }>;
    const clicks = clickData[0]?.total_clicks || 0;
    // CTR = (Visits / Clicks) * 100 (matches channel-performance API calculation)
    const ctr = clicks > 0 ? ((visitors / clicks) * 100).toFixed(2) : '0.00';

    // 6. Calculate revenue and CPA (using budget as revenue proxy)
    const revenue = parseFloat(campaign.budget) || 0;
    const cpa = conversions > 0 ? Math.round(revenue / conversions) : 0;

    // 7. Get daily performance data
    // Match channel-performance approach: count distinct users per tracking_code per day, then sum
    const dailyQuery = `
      SELECT 
        toDate(timestamp) as date,
        tracking_code,
        COUNT(DISTINCT user_id) as visitors_per_code,
        countIf(event_type = 'conversion') as conversions_per_code
      FROM analytics.visit_logs
      WHERE ${whereClause}
      GROUP BY date, tracking_code
      ORDER BY date ASC
    `;

    const dailyResult = await clickhouse.query({
      query: dailyQuery,
      format: 'JSONEachRow',
    });

    const dailyJson = await dailyResult.json() as Array<{ date: string; tracking_code: string; visitors_per_code: number; conversions_per_code: number }>;
    
    // Aggregate daily data by date (sum visitors and conversions across all tracking codes per day)
    const dailyMap = new Map<string, { visitors: number; conversions: number }>();
    dailyJson.forEach((row) => {
      const date = row.date;
      const visitors = row.visitors_per_code || 0;
      const conversions = row.conversions_per_code || 0;
      
      if (dailyMap.has(date)) {
        const existing = dailyMap.get(date)!;
        existing.visitors += visitors;
        existing.conversions += conversions;
      } else {
        dailyMap.set(date, { visitors, conversions });
      }
    });
    
    // Convert map to array and calculate metrics
    const dailyData = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        visitors: data.visitors,
        conversions: data.conversions,
        conversionRate: data.visitors > 0 ? ((data.conversions / data.visitors) * 100).toFixed(2) : '0.00',
        // Estimate daily cost based on total spent
        cost: conversions > 0 ? Math.round((parseFloat(campaign.spent) || 0) * (data.conversions / conversions)) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

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
