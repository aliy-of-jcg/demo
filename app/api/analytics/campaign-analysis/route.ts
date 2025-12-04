import { NextRequest, NextResponse } from 'next/server';
import clickhouse from '@/lib/clickhouse';
import { getPool } from '@/lib/mysql';
import { RowDataPacket } from 'mysql2';
import { requirePermission } from '@/lib/auth/api-middleware';
import type { AuthContext } from '@/lib/auth/types';
import { getDefaultTimezone } from '@/lib/system-settings';

export const dynamic = 'force-dynamic';

// Helper function to normalize domain (extract domain from URL)
function normalizeDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    let domain = urlObj.hostname.toLowerCase();
    // Remove www. prefix
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }
    return domain;
  } catch (error) {
    return '';
  }
}

export const GET = requirePermission('analytics:read', async (request: NextRequest, context: AuthContext) => {
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

    // Get timezone from system settings (GA behavior: use system default)
    const timezone = await getDefaultTimezone();

    // 2. Get all tracking codes for this campaign (include hidden for historical analytics)
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
    // Use campaign_id directly from ClickHouse (preserves data even after UTM hard deletion)
    // Also include tracking_code and utm_campaign for backward compatibility with legacy data
    if (validTrackingCodes.length === 0) {
      // Fallback: use campaign_id OR utm_campaign if no tracking codes available
      const utmCampaignsList = utmCampaigns.map(c => `'${c.replace(/'/g, "\\'")}'`).join(',');
      whereClause = `(campaign_id = ${campaignId} OR utm_campaign IN (${utmCampaignsList}))`;
    } else {
      // Primary method: use campaign_id (most reliable) + tracking_code + utm_campaign for legacy data
      const trackingCodesList = validTrackingCodes.map(code => `'${code.replace(/'/g, "\\'")}'`).join(',');
      const utmCampaignsList = utmCampaigns.map(c => `'${c.replace(/'/g, "\\'")}'`).join(',');

      // Include: campaign_id (denormalized) OR tracking_code OR legacy utm_campaign
      whereClause = `(campaign_id = ${campaignId} OR tracking_code IN (${trackingCodesList}) OR (tracking_code = '' AND utm_campaign IN (${utmCampaignsList})))`;
    }

    if (startDate && endDate) {
      whereClause += ` AND toDate(toTimeZone(timestamp, '${timezone}')) BETWEEN toDate('${startDate}') AND toDate('${endDate}')`;
    } else {
      if (startDate) {
        whereClause += ` AND toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${startDate}')`;
      }
      if (endDate) {
        whereClause += ` AND toDate(toTimeZone(timestamp, '${timezone}')) <= toDate('${endDate}')`;
      }
    }

    // Platform filter (utm_medium or utm_source)
    if (platform && platform !== 'all') {
      const escapedPlatform = platform.replace(/'/g, "\\'");
      whereClause += ` AND (utm_medium = '${escapedPlatform}' OR utm_source = '${escapedPlatform}')`;
    }

    // Exclude direct traffic to match campaigns list and detail page behavior
    whereClause += ` AND utm_source != '' AND utm_source != 'Direct' AND utm_source != '(direct)'`;

    // 4. Get visitor and conversion metrics from visit_logs
    // Count distinct users across ALL tracking codes for the campaign (not per tracking_code)
    // This ensures each user is counted only once per campaign, matching the campaigns page behavior
    const visitMetricsQuery = `
      SELECT 
        countDistinct(user_id) as unique_visitors,
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
    // Use actual tracking_code from database (same as visit query)
    // Also include clicks from hard-deleted UTMs (legacy data)
    let clicks = 0;
    let clicksFromLegacyData = 0;

    // First, get clicks from active tracking codes
    if (validTrackingCodes.length > 0) {
      const trackingCodesList = validTrackingCodes.map(code => `'${code.replace(/'/g, "\\'")}'`).join(',');
      let clickWhereClause = `tracking_code IN (${trackingCodesList})`;

      if (startDate && endDate) {
        clickWhereClause += ` AND toDate(toTimeZone(timestamp, '${timezone}')) BETWEEN toDate('${startDate}') AND toDate('${endDate}')`;
      } else {
        if (startDate) {
          clickWhereClause += ` AND toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${startDate}')`;
        }
        if (endDate) {
          clickWhereClause += ` AND toDate(toTimeZone(timestamp, '${timezone}')) <= toDate('${endDate}')`;
        }
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
      clicks = clickData[0]?.total_clicks || 0;
    } else {
      // Fallback: construct tracking code from UTM parameters (legacy data)
      const trackingCodesList = trackingCodes.map(tc => {
        const code = [tc.utm_source, tc.utm_medium, tc.utm_campaign].filter(Boolean).join('_');
        return `'${code.replace(/'/g, "\\'")}'`;
      }).join(',');

      let clickWhereClause = `tracking_code IN (${trackingCodesList})`;

      if (startDate && endDate) {
        clickWhereClause += ` AND toDate(toTimeZone(timestamp, '${timezone}')) BETWEEN toDate('${startDate}') AND toDate('${endDate}')`;
      } else {
        if (startDate) {
          clickWhereClause += ` AND toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${startDate}')`;
        }
        if (endDate) {
          clickWhereClause += ` AND toDate(toTimeZone(timestamp, '${timezone}')) <= toDate('${endDate}')`;
        }
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
      clicks = clickData[0]?.total_clicks || 0;
    }

    // Also get clicks from legacy data (hard-deleted UTMs) by matching utm_campaign name
    if (utmCampaigns.length > 0) {
      try {
        const utmCampaignsList = utmCampaigns.map(c => `'${c.replace(/'/g, "\\'")}'`).join(',');
        const activeTrackingCodesSet = new Set(validTrackingCodes);

        let legacyClickWhereClause = `utm_campaign IN (${utmCampaignsList}) AND tracking_code != '' AND tracking_code IS NOT NULL`;

        if (startDate && endDate) {
          legacyClickWhereClause += ` AND toDate(toTimeZone(timestamp, '${timezone}')) BETWEEN toDate('${startDate}') AND toDate('${endDate}')`;
        } else {
          if (startDate) {
            legacyClickWhereClause += ` AND toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${startDate}')`;
          }
          if (endDate) {
            legacyClickWhereClause += ` AND toDate(toTimeZone(timestamp, '${timezone}')) <= toDate('${endDate}')`;
          }
        }

        const legacyClicksQuery = await clickhouse.query({
          query: `
            SELECT 
              tracking_code,
              COUNT(*) as total_clicks
            FROM analytics.tracking_events
            WHERE ${legacyClickWhereClause}
            GROUP BY tracking_code
          `,
          format: 'JSONEachRow'
        });

        const legacyClicksData = await legacyClicksQuery.json() as any[];

        legacyClicksData.forEach((result: any) => {
          const code = result.tracking_code;
          const legacyClicks = parseInt(result.total_clicks || '0');

          // If this tracking code is not in active MySQL records, it's legacy data
          if (code && !activeTrackingCodesSet.has(code)) {
            clicksFromLegacyData += legacyClicks;
            clicks += legacyClicks; // Add to total clicks
          }
        });
      } catch (error) {
        console.error('Error fetching legacy clicks:', error);
      }
    }
    // CTR = (Visits / Clicks) * 100 (matches channel-performance API calculation)
    const ctr = clicks > 0 ? ((visitors / clicks) * 100).toFixed(2) : '0.00';

    // 5.5. Detect legacy data (hard-deleted UTMs) and count deleted links
    let hasLegacyData = false;
    let deletedLinksCount = 0;
    try {
      // Get all tracking codes from MySQL for this campaign (including hidden)
      const [allTrackingCodes] = await pool.query<RowDataPacket[]>(
        'SELECT tracking_code, status FROM utm_codes WHERE campaign_id = ?',
        [campaignId]
      );
      const allTrackingCodesInMySQL = new Set(
        allTrackingCodes.map(tc => tc.tracking_code).filter(code => code && code !== '')
      );
      const activeTrackingCodes = new Set(validTrackingCodes);

      // Count hidden UTMs as deleted links
      const hiddenUtms = allTrackingCodes.filter(tc => tc.status === 'hidden');
      deletedLinksCount += hiddenUtms.length;
      if (hiddenUtms.length > 0) {
        hasLegacyData = true;
      }

      // Check visit_logs for tracking codes that don't exist in MySQL
      if (campaignId) {
        const clickhouseTrackingCodesQuery = await clickhouse.query({
          query: `
            SELECT DISTINCT tracking_code
            FROM analytics.visit_logs
            WHERE campaign_id = ${campaignId}
              AND tracking_code != ''
              AND tracking_code IS NOT NULL
          `,
          format: 'JSONEachRow'
        });

        const clickhouseTrackingCodesData = await clickhouseTrackingCodesQuery.json() as Array<{ tracking_code: string }>;
        const clickhouseTrackingCodes = new Set(
          clickhouseTrackingCodesData.map(row => row.tracking_code?.trim() || row.tracking_code).filter(code => code && code !== '')
        );

        // Count hard-deleted links (tracking codes in ClickHouse but not in MySQL)
        for (const code of Array.from(clickhouseTrackingCodes)) {
          if (!allTrackingCodesInMySQL.has(code)) {
            hasLegacyData = true;
            deletedLinksCount++;
          }
        }

        // Also check if we have clicks from legacy data
        if (clicksFromLegacyData > 0) {
          hasLegacyData = true;
        }

        // Check if total tracking codes in ClickHouse > active tracking codes
        if (clickhouseTrackingCodes.size > activeTrackingCodes.size) {
          hasLegacyData = true;
        }
      }
    } catch (error) {
      console.error('Error checking for legacy data in campaign analysis:', error);
      // Still flag if we have legacy clicks
      if (clicksFromLegacyData > 0) {
        hasLegacyData = true;
      }
    }

    // 6. Calculate revenue and CPA (using budget as revenue proxy)
    const revenue = parseFloat(campaign.budget) || 0;
    const cpa = conversions > 0 ? Math.round(revenue / conversions) : 0;

    // 7. Get daily performance data
    // Count distinct users per day across ALL tracking codes (not per tracking_code)
    // This ensures each user is counted only once per day per campaign
    const dailyQuery = `
      SELECT 
        toDate(toTimeZone(timestamp, '${timezone}')) as date,
        countDistinct(user_id) as visitors,
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

    const dailyJson = await dailyResult.json() as Array<{ date: string; visitors: number; conversions: number }>;

    // Convert to array and calculate metrics
    const dailyData = dailyJson
      .map((row) => ({
        date: row.date,
        visitors: row.visitors || 0,
        conversions: row.conversions || 0,
        conversionRate: (row.visitors || 0) > 0 ? (((row.conversions || 0) / (row.visitors || 0)) * 100).toFixed(2) : '0.00',
        // Estimate daily cost based on total spent
        cost: conversions > 0 ? Math.round((parseFloat(campaign.spent) || 0) * ((row.conversions || 0) / conversions)) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 8. Batch check which landing page domains are tracked and enabled
    // Extract all unique domains from landing URLs
    const landingDomains = new Set<string>();
    trackingCodes.forEach(tc => {
      if (tc.landing_url) {
        const domain = normalizeDomain(tc.landing_url);
        if (domain) {
          landingDomains.add(domain);
        }
      }
    });

    // Batch check which domains are tracked and enabled (single query)
    const trackedDomainsSet = new Set<string>();
    if (landingDomains.size > 0) {
      try {
        const domainsList = Array.from(landingDomains).map(d => `'${d.replace(/'/g, "\\'")}'`).join(',');
        const [trackedDomains] = await pool.query<RowDataPacket[]>(
          `SELECT domain FROM tracked_websites WHERE domain IN (${domainsList}) AND is_enabled = 1`
        );
        trackedDomains.forEach((row: any) => {
          trackedDomainsSet.add(row.domain);
        });
      } catch (error) {
        console.error('Error checking tracked domains:', error);
      }
    }

    // 9. Get per-UTM breakdown with metrics and daily data
    const utmBreakdown = await Promise.all(
      trackingCodes
        .filter(tc => tc.status !== 'hidden') // Only show active/inactive UTMs
        .map(async (tc) => {
          const trackingCode = tc.tracking_code;

          // Build WHERE clause for this specific UTM
          let utmWhereClause = `tracking_code = '${trackingCode.replace(/'/g, "\\'")}'`;

          if (startDate && endDate) {
            utmWhereClause += ` AND toDate(toTimeZone(timestamp, '${timezone}')) BETWEEN toDate('${startDate}') AND toDate('${endDate}')`;
          } else {
            if (startDate) {
              utmWhereClause += ` AND toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${startDate}')`;
            }
            if (endDate) {
              utmWhereClause += ` AND toDate(toTimeZone(timestamp, '${timezone}')) <= toDate('${endDate}')`;
            }
          }

          // Get visitors and conversions for this UTM
          const utmVisitQuery = `
            SELECT 
              countDistinct(user_id) as unique_visitors,
              countIf(event_type = 'conversion') as conversions
            FROM analytics.visit_logs
            WHERE ${utmWhereClause}
          `;

          const utmVisitResult = await clickhouse.query({
            query: utmVisitQuery,
            format: 'JSONEachRow',
          });

          const utmVisitData = await utmVisitResult.json() as Array<{ unique_visitors: number; conversions: number }>;
          const utmVisitors = utmVisitData[0]?.unique_visitors || 0;
          const utmConversions = utmVisitData[0]?.conversions || 0;

          // Get clicks for this UTM
          let utmClickWhereClause = `tracking_code = '${trackingCode.replace(/'/g, "\\'")}'`;

          if (startDate && endDate) {
            utmClickWhereClause += ` AND toDate(toTimeZone(timestamp, '${timezone}')) BETWEEN toDate('${startDate}') AND toDate('${endDate}')`;
          } else {
            if (startDate) {
              utmClickWhereClause += ` AND toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${startDate}')`;
            }
            if (endDate) {
              utmClickWhereClause += ` AND toDate(toTimeZone(timestamp, '${timezone}')) <= toDate('${endDate}')`;
            }
          }

          const utmClickQuery = `
            SELECT COUNT(*) as total_clicks
            FROM analytics.tracking_events
            WHERE ${utmClickWhereClause}
          `;

          const utmClickResult = await clickhouse.query({
            query: utmClickQuery,
            format: 'JSONEachRow',
          });

          const utmClickData = await utmClickResult.json() as Array<{ total_clicks: number }>;
          const utmClicks = utmClickData[0]?.total_clicks || 0;

          // Get daily data for this UTM
          const utmDailyQuery = `
            SELECT 
              toDate(toTimeZone(timestamp, '${timezone}')) as date,
              countDistinct(user_id) as visitors,
              countIf(event_type = 'conversion') as conversions
            FROM analytics.visit_logs
            WHERE ${utmWhereClause}
            GROUP BY date
            ORDER BY date ASC
          `;

          const utmDailyResult = await clickhouse.query({
            query: utmDailyQuery,
            format: 'JSONEachRow',
          });

          const utmDailyJson = await utmDailyResult.json() as Array<{ date: string; visitors: number; conversions: number }>;

          // Check if landing page is tracked (domain exists in tracked_websites AND is_enabled = 1)
          let landingPageTracked = true;
          if (tc.landing_url) {
            const domain = normalizeDomain(tc.landing_url);
            landingPageTracked = domain ? trackedDomainsSet.has(domain) : false;
          }

          return {
            id: tc.id,
            name: tc.name,
            tracking_code: trackingCode,
            utm_source: tc.utm_source,
            utm_medium: tc.utm_medium,
            utm_content: tc.utm_content,
            status: tc.status,
            budget: parseFloat(tc.budget) || 0,
            spent: parseFloat(tc.spent) || 0,
            landingPageTracked,
            metrics: {
              clicks: utmClicks,
              visitors: utmVisitors,
              conversions: utmConversions,
              conversionRate: utmVisitors > 0 ? ((utmConversions / utmVisitors) * 100).toFixed(2) : '0.00',
              ctr: utmClicks > 0 ? ((utmVisitors / utmClicks) * 100).toFixed(2) : '0.00',
            },
            dailyData: utmDailyJson.map(row => ({
              date: row.date,
              visitors: row.visitors || 0,
              conversions: row.conversions || 0,
              conversionRate: (row.visitors || 0) > 0 ? (((row.conversions || 0) / (row.visitors || 0)) * 100).toFixed(2) : '0.00',
            })),
          };
        })
    );

    // Calculate non-legacy metrics (only from active UTMs) for UTM Comparison view
    const nonLegacyMetrics = {
      visitors: 0,
      conversions: 0,
      clicks: 0,
    };

    utmBreakdown.forEach(utm => {
      nonLegacyMetrics.visitors += utm.metrics.visitors;
      nonLegacyMetrics.conversions += utm.metrics.conversions;
      nonLegacyMetrics.clicks += utm.metrics.clicks;
    });

    const nonLegacyConversionRate = nonLegacyMetrics.visitors > 0
      ? ((nonLegacyMetrics.conversions / nonLegacyMetrics.visitors) * 100).toFixed(2)
      : '0.00';
    const nonLegacyCtr = nonLegacyMetrics.clicks > 0
      ? ((nonLegacyMetrics.visitors / nonLegacyMetrics.clicks) * 100).toFixed(2)
      : '0.00';

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
      hasLegacyData,
      clicksFromLegacyData,
      deletedLinksCount,
      nonLegacyMetrics: {
        visitors: nonLegacyMetrics.visitors,
        conversions: nonLegacyMetrics.conversions,
        conversionRate: nonLegacyConversionRate,
        clicks: nonLegacyMetrics.clicks,
        ctr: nonLegacyCtr,
      },
      dailyData,
      utmBreakdown,
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
});
