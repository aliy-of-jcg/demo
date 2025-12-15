import { NextRequest, NextResponse } from 'next/server';
import clickhouse, { queryWithMemoryLimit } from '@/lib/clickhouse';
import { getPool } from '@/lib/mysql';
import { requirePermission, type AuthContext } from '@/lib/auth/api-middleware';
import { getDefaultTimezone } from '@/lib/system-settings';

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

export const GET = requirePermission('analytics:read', async (request: NextRequest, context: AuthContext) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const MAX_RANGE_DAYS = 90;

    // Get date range from query parameters (default: last 30 days)
    let endDate = searchParams.get('end') || new Date().toISOString().split('T')[0];
    let startDate = searchParams.get('start');

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

    console.log(`📊 Channel Performance Analysis API - Date Range: ${startDate} to ${endDate}, Timezone: ${timezone}`);

    const pool = getPool();

    // ============================================================
    // GOOGLE ANALYTICS APPROACH: Query actual traffic data first
    // Group by utm_source, utm_medium from visit_logs (actual traffic)
    // NOT by campaigns.source (configuration)
    // ============================================================

    // Step 1: Get actual traffic data grouped by UTM parameters
    // Optimize: Use uniqExact instead of countDistinct for better memory efficiency
    const trafficQuery = `
      SELECT 
        tracking_code,
        utm_source,
        utm_medium,
        utm_campaign,
        uniqExact(session_id) as sessions,
        uniqExact(user_id) as users,
        countIf(event_type = 'conversion') as conversions
      FROM analytics.visit_logs_buffer
      WHERE toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${startDate}')
        AND toDate(toTimeZone(timestamp, '${timezone}')) <= toDate('${endDate}')
        AND utm_source != ''
        AND utm_source != 'Direct'
        AND utm_source != '(direct)'
        AND tracking_code != ''
      GROUP BY tracking_code, utm_source, utm_medium, utm_campaign
    `;

    const trafficResult = await queryWithMemoryLimit(trafficQuery, {
      format: 'JSONEachRow'
    });

    const trafficData = await trafficResult.json() as any[];

    // Step 1.5: Get direct traffic data (utm_source = 'Direct' or '(direct)' for legacy data)
    const directTrafficQuery = `
      SELECT 
        uniqExact(session_id) as sessions,
        uniqExact(user_id) as users,
        countIf(event_type = 'conversion') as conversions
      FROM analytics.visit_logs_buffer
      WHERE 
        (utm_source = 'Direct' OR utm_source = '(direct)' OR utm_source = '')
        AND toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${startDate}')
        AND toDate(toTimeZone(timestamp, '${timezone}')) <= toDate('${endDate}')
    `;

    const directTrafficResult = await queryWithMemoryLimit(directTrafficQuery, {
      format: 'JSONEachRow'
    });

    const directTrafficData = await directTrafficResult.json() as any[];
    const directSessions = parseInt(directTrafficData[0]?.sessions) || 0;
    const directUsers = parseInt(directTrafficData[0]?.users) || 0;
    const directConversions = parseInt(directTrafficData[0]?.conversions) || 0;

    // If no traffic data at all, return empty
    if (trafficData.length === 0 && directUsers === 0) {
      return NextResponse.json({
        success: true,
        dateRange: { start: startDate, end: endDate },
        channels: [],
        chartData: []
      });
    }

    // Step 2: Get campaign metadata by tracking_code (most reliable method)
    // This removes dependency on name matching - campaigns can be renamed freely
    const trackingCodes = Array.from(new Set(trafficData
      .map(t => t.tracking_code)
      .filter(code => code && code !== '')));

    let campaignMap = new Map();
    let campaignNameMap = new Map(); // Fallback: map by campaign name for legacy data

    if (trackingCodes.length > 0) {
      const placeholders = trackingCodes.map(() => '?').join(',');
      const [campaigns] = await pool.execute(`
        SELECT 
          u.tracking_code,
          c.id as campaign_id,
          c.name as campaign_name,
          c.status,
          c.budget,
          c.spent as ad_cost
        FROM utm_codes u
        JOIN campaigns c ON u.campaign_id = c.id
        WHERE u.tracking_code IN (${placeholders})
      `, trackingCodes);

      (campaigns as any[]).forEach(c => {
        campaignMap.set(c.tracking_code, {
          campaign_id: c.campaign_id,
          name: c.campaign_name,
          status: c.status,
          ad_cost: parseFloat(c.ad_cost) || 0
        });

        // Also store by name for fallback matching
        if (!campaignNameMap.has(c.campaign_name)) {
          campaignNameMap.set(c.campaign_name, {
            campaign_id: c.campaign_id,
            name: c.campaign_name,
            status: c.status,
            ad_cost: parseFloat(c.ad_cost) || 0
          });
        }
      });
    }

    // FALLBACK: For legacy data without tracking codes, get campaigns by name
    // This handles visits logged before we added the _tc parameter
    const campaignNamesWithoutCodes = Array.from(new Set(trafficData
      .filter(t => !t.tracking_code || t.tracking_code === '')
      .map(t => t.utm_campaign)
      .filter(name => name && name !== '')));

    if (campaignNamesWithoutCodes.length > 0) {
      const namePlaceholders = campaignNamesWithoutCodes.map(() => '?').join(',');
      const [campaignsByName] = await pool.execute(`
        SELECT 
          c.id as campaign_id,
          c.name as campaign_name,
          c.status,
          c.budget,
          c.spent as ad_cost
        FROM campaigns c
        WHERE c.name IN (${namePlaceholders})
      `, campaignNamesWithoutCodes);

      (campaignsByName as any[]).forEach(c => {
        if (!campaignNameMap.has(c.campaign_name)) {
          campaignNameMap.set(c.campaign_name, {
            campaign_id: c.campaign_id,
            name: c.campaign_name,
            status: c.status,
            ad_cost: parseFloat(c.ad_cost) || 0
          });
        }
      });
    }

    // Step 3: Get click data from ClickHouse tracking_events (single source of truth)
    // IMPORTANT: Filter clicks by same date range as traffic data for accurate CTR calculation
    let clicksMap = new Map();
    if (trackingCodes.length > 0) {
      try {
        const escapedCodes = trackingCodes.map(code => `'${code.replace(/'/g, "\\'")}'`).join(',');

        // Query buffer table directly for real-time data
        const clicksQuery = `
          SELECT 
            tracking_code,
            COUNT(*) as total_clicks
          FROM analytics.tracking_events_buffer
          WHERE tracking_code IN (${escapedCodes})
            AND toDate(toTimeZone(timestamp, 'Asia/Seoul')) BETWEEN toDate('${startDate}') AND toDate('${endDate}')
          GROUP BY tracking_code
        `;

        const clicksResult = await queryWithMemoryLimit(clicksQuery, {
          format: 'JSONEachRow'
        });

        const clicksData = await clicksResult.json() as any[];
        clicksData.forEach((row: any) => {
          clicksMap.set(row.tracking_code, parseInt(row.total_clicks) || 0);
        });
      } catch (error) {
        console.warn('⚠️ Failed to fetch clicks from ClickHouse:', error);
        // Continue with empty clicks map if ClickHouse fails
      }
    }

    // Step 4: Enrich traffic data with campaign metadata and clicks
    const enrichedData: CampaignData[] = trafficData.map(traffic => {
      // Try to get campaign by tracking_code first (most reliable)
      let campaign = campaignMap.get(traffic.tracking_code);

      // FALLBACK: If no tracking_code or not found, try matching by campaign name
      // This handles legacy data logged before we added the _tc parameter
      if (!campaign && traffic.utm_campaign) {
        campaign = campaignNameMap.get(traffic.utm_campaign);
      }

      // If still not found, create unknown campaign entry
      if (!campaign) {
        campaign = {
          campaign_id: 0,
          name: traffic.utm_campaign || 'Unknown Campaign',
          status: 'active',
          ad_cost: 0
        };
      }

      const clicks = clicksMap.get(traffic.tracking_code) || 0;
      const sessions = parseInt(traffic.sessions) || 0;
      const users = parseInt(traffic.users) || 0;
      const conversions = parseInt(traffic.conversions) || 0;

      // Calculate metrics
      const conversionRate = users > 0 ? (conversions / users) * 100 : 0;
      const ctr = clicks > 0 ? (users / clicks) * 100 : 0;

      return {
        campaign_id: campaign.campaign_id,
        campaign_name: campaign.name,
        source: traffic.utm_source,      // ← From visit_logs (actual traffic)
        medium: traffic.utm_medium,      // ← From visit_logs (actual traffic)
        status: campaign.status,
        visits: users,
        conversions: conversions,
        conversion_rate: parseFloat(conversionRate.toFixed(2)),
        ad_cost: campaign.ad_cost,
        clicks: clicks,
        ctr: parseFloat(ctr.toFixed(2))
      };
    });

    // Step 4.5: Add Direct channel if there's direct traffic
    if (directUsers > 0) {
      const directConversionRate = directUsers > 0 ? (directConversions / directUsers) * 100 : 0;

      enrichedData.push({
        campaign_id: 0, // Special ID for direct traffic
        campaign_name: 'Direct Traffic',
        source: 'direct',
        medium: '(none)',
        status: 'active',
        visits: directUsers,
        conversions: directConversions,
        conversion_rate: parseFloat(directConversionRate.toFixed(2)),
        ad_cost: 0, // Direct traffic has no ad cost
        clicks: directUsers, // For direct, visits = clicks (no tracking link)
        ctr: 100 // 100% CTR for direct (they typed URL or bookmark)
      });
    }

    // Step 4.75: CONSOLIDATE multiple tracking codes for the same campaign
    // A campaign can have multiple UTM codes, but should appear as ONE row in the report
    const campaignAggregateMap = new Map<string, CampaignData>();

    enrichedData.forEach(item => {
      // Create unique key: campaign_id + source + medium
      // This groups all tracking codes for the same campaign together
      const key = `${item.campaign_id}_${item.source}_${item.medium}`;

      if (campaignAggregateMap.has(key)) {
        // Aggregate with existing campaign data
        const existing = campaignAggregateMap.get(key)!;
        existing.visits += item.visits;
        existing.conversions += item.conversions;
        existing.clicks += item.clicks;
        existing.ad_cost += item.ad_cost;

        // Recalculate metrics based on aggregated data
        existing.conversion_rate = existing.visits > 0
          ? parseFloat(((existing.conversions / existing.visits) * 100).toFixed(2))
          : 0;
        existing.ctr = existing.clicks > 0
          ? parseFloat(((existing.visits / existing.clicks) * 100).toFixed(2))
          : 0;
      } else {
        // First occurrence of this campaign
        campaignAggregateMap.set(key, { ...item });
      }
    });

    // Convert aggregated map back to array
    const consolidatedData = Array.from(campaignAggregateMap.values());

    // Step 5: Group by ACTUAL utm_source (channel) from traffic data
    const channelMap = new Map<string, CampaignData[]>();

    consolidatedData.forEach(item => {
      const channel = item.source || 'other';  // ← From visit_logs, NOT campaigns.source
      if (!channelMap.has(channel)) {
        channelMap.set(channel, []);
      }
      channelMap.get(channel)!.push(item);
    });

    // Step 6: Calculate channel summaries
    const channels: ChannelSummary[] = Array.from(channelMap.entries()).map(([channel, campaigns]) => {
      const totalVisits = campaigns.reduce((sum, c) => sum + c.visits, 0);
      const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
      const totalAdCost = campaigns.reduce((sum, c) => sum + c.ad_cost, 0);
      const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);

      // Calculate CTR correctly: (Total Visits / Total Clicks) * 100
      const avgCTR = totalClicks > 0
        ? (totalVisits / totalClicks) * 100
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
});

