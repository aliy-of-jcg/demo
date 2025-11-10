import { NextRequest, NextResponse } from 'next/server';
import clickhouse from '@/lib/clickhouse';
import { getPool } from '@/lib/mysql';

export const dynamic = 'force-dynamic';

interface CampaignData {
  campaign_id: number;
  campaign_name: string;
  source: string;
  medium: string;
  status: string;
  visits: number;
  conversions: number;
  conversion_rate: number;
  ad_cost: number;
  clicks: number;
  ctr: number;
}

interface ChannelSummary {
  channel: string;
  total_visits: number;
  total_conversions: number;
  total_ad_cost: number;
  avg_ctr: number;
  campaigns: CampaignData[];
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Get date range from query parameters (default: last 30 days)
    const endDate = searchParams.get('end') || new Date().toISOString().split('T')[0];
    const startDate = searchParams.get('start') || (() => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date.toISOString().split('T')[0];
    })();

    console.log(`📊 Channel Performance Analysis API - Date Range: ${startDate} to ${endDate}`);

    const pool = getPool();

    // Step 1: Get all campaigns with their basic info and ad costs
    const [campaigns] = await pool.execute(`
      SELECT 
        id,
        name,
        source,
        medium,
        status,
        spent as ad_cost,
        start_date,
        end_date
      FROM campaigns
      WHERE start_date <= ? 
        AND end_date >= ?
        AND status != 'hidden'
      ORDER BY source, name
    `, [endDate, startDate]);

    const campaignList = campaigns as any[];

    if (campaignList.length === 0) {
      return NextResponse.json({
        success: true,
        dateRange: { start: startDate, end: endDate },
        channels: [],
        chartData: []
      });
    }

    // Step 2: Get visit and conversion data from ClickHouse for each campaign
    const campaignIds = campaignList.map(c => c.id);
    
    if (campaignIds.length === 0) {
      return NextResponse.json({
        success: true,
        dateRange: { start: startDate, end: endDate },
        channels: [],
        chartData: []
      });
    }
    
    const clickhouseQuery = `
      SELECT 
        campaign_id,
        COUNT(DISTINCT user_id) as visits,
        SUM(CASE WHEN event_type = 'conversion' THEN 1 ELSE 0 END) as conversions
      FROM analytics.visit_logs
      WHERE 
        campaign_id > 0 
        AND campaign_id IN (${campaignIds.join(',')})
        AND toDate(timestamp) BETWEEN toDate('${startDate}') AND toDate('${endDate}')
      GROUP BY campaign_id
    `;

    const clickhouseResult = await clickhouse.query({
      query: clickhouseQuery,
      format: 'JSONEachRow'
    });

    const analyticsData = await clickhouseResult.json() as any[];
    
    // Create a map for quick lookup
    const analyticsMap = new Map();
    analyticsData.forEach(item => {
      analyticsMap.set(item.campaign_id, {
        visits: parseInt(item.visits) || 0,
        conversions: parseInt(item.conversions) || 0
      });
    });

    // Step 3: Get click data from utm_codes (tracking links)
    const [utmCodes] = await pool.execute(`
      SELECT 
        campaign_id,
        SUM(clicks) as total_clicks
      FROM utm_codes
      WHERE campaign_id IN (${campaignIds.join(',')})
      GROUP BY campaign_id
    `);

    const clicksMap = new Map();
    (utmCodes as any[]).forEach(item => {
      clicksMap.set(item.campaign_id, parseInt(item.total_clicks) || 0);
    });

    // Step 4: Combine all data
    const enrichedCampaigns: CampaignData[] = campaignList.map(campaign => {
      const analytics = analyticsMap.get(campaign.id) || { visits: 0, conversions: 0 };
      const clicks = clicksMap.get(campaign.id) || 0;
      const visits = analytics.visits;
      const conversions = analytics.conversions;
      const adCost = parseFloat(campaign.ad_cost) || 0;

      // Calculate metrics
      const conversionRate = visits > 0 ? (conversions / visits) * 100 : 0;
      const ctr = clicks > 0 ? (visits / clicks) * 100 : 0;

      return {
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        source: campaign.source,
        medium: campaign.medium,
        status: campaign.status,
        visits: visits,
        conversions: conversions,
        conversion_rate: parseFloat(conversionRate.toFixed(2)),
        ad_cost: adCost,
        clicks: clicks,
        ctr: parseFloat(ctr.toFixed(2))
      };
    });

    // Step 5: Group campaigns by channel (source)
    const channelMap = new Map<string, CampaignData[]>();
    
    enrichedCampaigns.forEach(campaign => {
      const channel = campaign.source || 'other';
      if (!channelMap.has(channel)) {
        channelMap.set(channel, []);
      }
      channelMap.get(channel)!.push(campaign);
    });

    // Step 6: Calculate channel summaries
    const channels: ChannelSummary[] = Array.from(channelMap.entries()).map(([channel, campaigns]) => {
      const totalVisits = campaigns.reduce((sum, c) => sum + c.visits, 0);
      const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
      const totalAdCost = campaigns.reduce((sum, c) => sum + c.ad_cost, 0);
      const avgCTR = campaigns.length > 0 
        ? campaigns.reduce((sum, c) => sum + c.ctr, 0) / campaigns.length 
        : 0;

      return {
        channel: channel,
        total_visits: totalVisits,
        total_conversions: totalConversions,
        total_ad_cost: totalAdCost,
        avg_ctr: parseFloat(avgCTR.toFixed(2)),
        campaigns: campaigns
      };
    });

    // Sort channels by total visits (descending)
    channels.sort((a, b) => b.total_visits - a.total_visits);

    // Step 7: Prepare chart data (channel comparison)
    const chartData = channels.map(channel => ({
      name: channel.channel.charAt(0).toUpperCase() + channel.channel.slice(1),
      visits: channel.total_visits,
      conversions: channel.total_conversions,
      adCost: channel.total_ad_cost
    }));

    const response = {
      success: true,
      dateRange: {
        start: startDate,
        end: endDate
      },
      channels: channels,
      chartData: chartData
    };

    console.log(`✅ Channel Performance data fetched: ${channels.length} channels, ${enrichedCampaigns.length} campaigns`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Channel Performance Analysis API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch channel performance data',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

