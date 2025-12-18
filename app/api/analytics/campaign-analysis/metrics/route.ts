import { NextRequest, NextResponse } from 'next/server';
import clickhouse, { queryWithMemoryLimit } from '@/lib/clickhouse';
import { getPool } from '@/lib/mysql';
import { RowDataPacket } from 'mysql2';
import { requirePermission, type AuthContext } from '@/lib/auth/api-middleware';
import { getDefaultTimezone } from '@/lib/system-settings';
import { getCache, setCache } from '@/lib/cache/cache';

export const dynamic = 'force-dynamic';

const sectionName = 'metrics';

export const GET = requirePermission('analytics:read', async (request: NextRequest, context: AuthContext) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const campaignId = searchParams.get('campaign_id');
    const platform = searchParams.get('platform');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: 'campaign_id is required' },
        { status: 400 }
      );
    }

    console.log(sectionName);

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

    // Get timezone from system settings
    const timezone = await getDefaultTimezone();

    // Add date filtering with default and max enforcement
    const MAX_RANGE_DAYS = 90;
    let finalEndDate = endDate || new Date().toISOString().split('T')[0];
    let finalStartDate = startDate;

    if (!finalStartDate) {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      finalStartDate = date.toISOString().split('T')[0];
    }

    // Enforce maximum date window
    const startObj = new Date(finalStartDate);
    const endObj = new Date(finalEndDate);
    const diffMs = endObj.getTime() - startObj.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > MAX_RANGE_DAYS) {
      const clampedStart = new Date(endObj);
      clampedStart.setDate(clampedStart.getDate() - MAX_RANGE_DAYS);
      finalStartDate = clampedStart.toISOString().split('T')[0];
    }

    // Check cache (30 seconds TTL)
    const cacheTtlMs = 30_000;
    const cacheKey = `campaign-analysis-${sectionName}:${campaignId}:${finalStartDate}:${finalEndDate}:${platform || 'all'}:${timezone}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // 2. Get all tracking codes for this campaign
    const [trackingCodes] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, tracking_code, utm_campaign, utm_source, utm_medium, utm_content, status, budget, spent, landing_url FROM utm_codes WHERE campaign_id = ?',
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
        hasLegacyData: false,
        clicksFromLegacyData: 0,
        deletedLinksCount: 0,
      });
    }

    // 3. Extract unique platforms
    const allPlatforms = Array.from(new Set(trackingCodes.map(tc => tc.utm_medium || tc.utm_source))).filter(Boolean);

    // Build WHERE clause using tracking_code
    const validTrackingCodes = trackingCodes
      .map(tc => tc.tracking_code)
      .filter(code => code && code !== '');

    const utmCampaigns = Array.from(new Set(trackingCodes.map(tc => tc.utm_campaign))).filter(Boolean);

    let whereClause: string;
    if (validTrackingCodes.length === 0) {
      const utmCampaignsList = utmCampaigns.map(c => `'${c.replace(/'/g, "\\'")}'`).join(',');
      whereClause = `(campaign_id = ${campaignId} OR utm_campaign IN (${utmCampaignsList}))`;
    } else {
      const trackingCodesList = validTrackingCodes.map(code => `'${code.replace(/'/g, "\\'")}'`).join(',');
      const utmCampaignsList = utmCampaigns.map(c => `'${c.replace(/'/g, "\\'")}'`).join(',');
      whereClause = `(campaign_id = ${campaignId} OR tracking_code IN (${trackingCodesList}) OR (tracking_code = '' AND utm_campaign IN (${utmCampaignsList})))`;
    }

    whereClause += ` AND toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${finalStartDate}') AND toDate(toTimeZone(timestamp, '${timezone}')) <= toDate('${finalEndDate}')`;

    if (platform && platform !== 'all') {
      const escapedPlatform = platform.replace(/'/g, "\\'");
      whereClause += ` AND (utm_medium = '${escapedPlatform}' OR utm_source = '${escapedPlatform}')`;
    }

    whereClause += ` AND utm_source != '' AND utm_source != 'Direct' AND utm_source != '(direct)'`;

    // 4. Get visitor and conversion metrics
    const visitMetricsQuery = `
      SELECT 
        countDistinct(user_id) as unique_visitors,
        countIf(event_type = 'conversion') as conversions
      FROM analytics.visit_logs_buffer
      WHERE ${whereClause}
    `;

    const visitResult = await queryWithMemoryLimit(visitMetricsQuery, {
      format: 'JSONEachRow',
    });

    const visitData = await visitResult.json() as Array<{ unique_visitors: number; conversions: number }>;
    const visitors = visitData[0]?.unique_visitors || 0;
    const conversions = visitData[0]?.conversions || 0;
    const conversionRate = visitors > 0 ? ((conversions / visitors) * 100).toFixed(2) : '0.00';

    // 5. Get click metrics
    let clicks = 0;
    let clicksFromLegacyData = 0;

    if (validTrackingCodes.length > 0) {
      const trackingCodesList = validTrackingCodes.map(code => `'${code.replace(/'/g, "\\'")}'`).join(',');
      let clickWhereClause = `tracking_code IN (${trackingCodesList})`;
      clickWhereClause += ` AND toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${finalStartDate}') AND toDate(toTimeZone(timestamp, '${timezone}')) <= toDate('${finalEndDate}')`;

      const clickQuery = `
        SELECT COUNT(*) as total_clicks
        FROM analytics.tracking_events_buffer
        WHERE ${clickWhereClause}
      `;

      const clickResult = await queryWithMemoryLimit(clickQuery, {
        format: 'JSONEachRow',
      });

      const clickData = await clickResult.json() as Array<{ total_clicks: number }>;
      clicks = clickData[0]?.total_clicks || 0;
    }

    // Get clicks from legacy data
    if (utmCampaigns.length > 0) {
      try {
        const utmCampaignsList = utmCampaigns.map(c => `'${c.replace(/'/g, "\\'")}'`).join(',');
        const activeTrackingCodesSet = new Set(validTrackingCodes);

        let legacyClickWhereClause = `utm_campaign IN (${utmCampaignsList}) AND tracking_code != '' AND tracking_code IS NOT NULL`;
        legacyClickWhereClause += ` AND toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${finalStartDate}') AND toDate(toTimeZone(timestamp, '${timezone}')) <= toDate('${finalEndDate}')`;

        const legacyClicksQuery = await queryWithMemoryLimit(`
            SELECT 
              tracking_code,
              COUNT(*) as total_clicks
            FROM analytics.tracking_events_buffer
            WHERE ${legacyClickWhereClause}
            GROUP BY tracking_code
          `, { format: 'JSONEachRow' });

        const legacyClicksData = await legacyClicksQuery.json() as any[];

        legacyClicksData.forEach((result: any) => {
          const code = result.tracking_code;
          const legacyClicks = parseInt(result.total_clicks || '0');
          if (code && !activeTrackingCodesSet.has(code)) {
            clicksFromLegacyData += legacyClicks;
            clicks += legacyClicks;
          }
        });
      } catch (error) {
        console.error('Error fetching legacy clicks:', error);
      }
    }

    const ctr = clicks > 0 ? ((visitors / clicks) * 100).toFixed(2) : '0.00';

    // 5.5. Detect legacy data and count deleted links
    let hasLegacyData = false;
    let deletedLinksCount = 0;
    try {
      const [allTrackingCodes] = await pool.query<RowDataPacket[]>(
        'SELECT tracking_code, status FROM utm_codes WHERE campaign_id = ?',
        [campaignId]
      );
      const allTrackingCodesInMySQL = new Set(
        allTrackingCodes.map(tc => tc.tracking_code).filter(code => code && code !== '')
      );
      const activeTrackingCodes = new Set(validTrackingCodes);

      const hiddenUtms = allTrackingCodes.filter(tc => tc.status === 'hidden');
      deletedLinksCount += hiddenUtms.length;
      if (hiddenUtms.length > 0) {
        hasLegacyData = true;
      }

      if (campaignId) {
        const clickhouseTrackingCodesQuery = await queryWithMemoryLimit(`
            SELECT DISTINCT tracking_code
            FROM analytics.visit_logs_buffer
            WHERE campaign_id = ${campaignId}
              AND tracking_code != ''
              AND tracking_code IS NOT NULL
          `, { format: 'JSONEachRow' });

        const clickhouseTrackingCodesData = await clickhouseTrackingCodesQuery.json() as Array<{ tracking_code: string }>;
        const clickhouseTrackingCodes = new Set(
          clickhouseTrackingCodesData.map(row => row.tracking_code?.trim() || row.tracking_code).filter(code => code && code !== '')
        );

        for (const code of Array.from(clickhouseTrackingCodes)) {
          if (!allTrackingCodesInMySQL.has(code)) {
            hasLegacyData = true;
            deletedLinksCount++;
          }
        }

        if (clickhouseTrackingCodes.size > activeTrackingCodes.size) {
          hasLegacyData = true;
        }
      }
    } catch (error) {
      console.error('Error checking for legacy data:', error);
      if (clicksFromLegacyData > 0) {
        hasLegacyData = true;
      }
    }

    // 6. Calculate revenue and CPA
    const revenue = parseFloat(campaign.budget) || 0;
    const cpa = conversions > 0 ? Math.round(revenue / conversions) : 0;

    // 7. Get daily performance data
    const dailyQuery = `
      SELECT 
        toDate(toTimeZone(timestamp, '${timezone}')) as date,
        countDistinct(user_id) as visitors,
        countIf(event_type = 'conversion') as conversions
      FROM analytics.visit_logs_buffer
      WHERE ${whereClause}
      GROUP BY date
      ORDER BY date ASC
    `;

    const dailyResult = await queryWithMemoryLimit(dailyQuery, {
      format: 'JSONEachRow',
    });

    const dailyJson = await dailyResult.json() as Array<{ date: string; visitors: number; conversions: number }>;

    const dailyData = dailyJson
      .map((row) => ({
        date: row.date,
        visitors: row.visitors || 0,
        conversions: row.conversions || 0,
        conversionRate: (row.visitors || 0) > 0 ? (((row.conversions || 0) / (row.visitors || 0)) * 100).toFixed(2) : '0.00',
        cost: conversions > 0 ? Math.round((parseFloat(campaign.spent) || 0) * ((row.conversions || 0) / conversions)) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const response = {
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
      hasLegacyData,
      clicksFromLegacyData,
      deletedLinksCount,
    };

    await setCache(cacheKey, response, cacheTtlMs);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Campaign analysis metrics API error:', error);
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

