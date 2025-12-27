import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import clickhouse, { queryWithMemoryLimit } from '@/lib/clickhouse';
import { requirePermission, type AuthContext } from '@/lib/auth/api-middleware';
import { getCache, setCache } from '@/lib/cache/cache';
import { parseRequestBody } from '@/lib/utils/parse-request-body';


export const GET = requirePermission('campaigns:read', async (request: NextRequest, context: AuthContext) => {
  const cacheTtlMs = 60_000; // 60s
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limitParam = parseInt(searchParams.get('limit') || '10');
  // Cap limit to avoid heavy queries; allow smaller pages
  const limit = Math.min(Math.max(limitParam, 1), 100);

  console.log(`📋 Campaigns API - Page: ${page}, Limit: ${limit}, Search: ${searchParams.get('search') || 'none'}`);

  // Cache key includes filters/pagination/sort
  const cacheKey = `campaigns:${page}:${limit}:${searchParams.get('search') || ''}:${searchParams.get('source') || ''}:${searchParams.get('medium') || ''}:${searchParams.get('status') || ''}:${searchParams.get('course_id') || ''}:${searchParams.get('start_date') || ''}:${searchParams.get('end_date') || ''}:${searchParams.get('sort_by') || ''}:${searchParams.get('sort_order') || ''}`;

  const cached = await getCache<any>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const search = searchParams.get('search') || '';
    const source = searchParams.get('source') || '';
    const medium = searchParams.get('medium') || '';
    const status = searchParams.get('status') || '';
    const courseId = searchParams.get('course_id') || '';
    const startDate = searchParams.get('start_date') || '';
    const endDate = searchParams.get('end_date') || '';
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortOrder = searchParams.get('sort_order') || 'DESC';

    const offset = (page - 1) * limit;

    // Whitelist valid sort columns to prevent SQL injection
    const validSortColumns = ['id', 'name', 'source', 'medium', 'status', 'start_date', 'end_date', 'budget', 'spent', 'created_at', 'updated_at'];
    const validSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const pool = getPool();

    try {
      // Build WHERE conditions dynamically
      let whereConditions = ' AND campaigns.status != \'hidden\''; // Exclude hidden campaigns (soft deleted)
      const countParams: any[] = [];
      const queryParams: any[] = [];

      if (search) {
        whereConditions += ' AND (campaigns.name LIKE ? OR courses.name LIKE ?)';
        countParams.push(`%${search}%`, `%${search}%`);
        queryParams.push(`%${search}%`, `%${search}%`);
      }

      if (source) {
        whereConditions += ' AND campaigns.source = ?';
        countParams.push(source);
        queryParams.push(source);
      }

      if (medium) {
        whereConditions += ' AND campaigns.medium = ?';
        countParams.push(medium);
        queryParams.push(medium);
      }

      if (status) {
        whereConditions += ' AND campaigns.status = ?';
        countParams.push(status);
        queryParams.push(status);
      }

      if (courseId) {
        whereConditions += ' AND campaigns.course_id = ?';
        countParams.push(parseInt(courseId));
        queryParams.push(parseInt(courseId));
      }

      if (startDate) {
        whereConditions += ' AND campaigns.start_date >= ?';
        countParams.push(startDate);
        queryParams.push(startDate);
      }

      if (endDate) {
        whereConditions += ' AND campaigns.end_date <= ?';
        countParams.push(endDate);
        queryParams.push(endDate);
      }

      // Get total count
      const countQuery = `
      SELECT COUNT(*) as total
      FROM campaigns
      LEFT JOIN courses ON campaigns.course_id = courses.id
      WHERE 1=1${whereConditions}
    `;

      const [countResult] = await pool.execute(countQuery, countParams);
      const total = (countResult as any)[0].total;

      // Get campaigns with course info (without duplicates from tracking links)
      // Build the complete query without string interpolation in ORDER BY
      const baseQuery = `
      SELECT DISTINCT
        campaigns.id,
        campaigns.name,
        campaigns.course_id,
        campaigns.source,
        campaigns.medium,
        campaigns.status,
        campaigns.start_date,
        campaigns.end_date,
        campaigns.budget,
        campaigns.spent,
        campaigns.description,
        campaigns.created_at,
        campaigns.updated_at,
        courses.name as course_name,
        courses.code as course_code
      FROM campaigns
      LEFT JOIN courses ON campaigns.course_id = courses.id
      WHERE 1=1${whereConditions}
    `;

      // Manually construct ORDER BY and LIMIT (safe because validSortBy and validSortOrder are whitelisted)
      const fullQuery = baseQuery + ` ORDER BY campaigns.${validSortBy} ${validSortOrder} LIMIT ${limit} OFFSET ${offset}`;

      const [campaigns] = await pool.execute(fullQuery, queryParams);

      // Get all tracking links for these campaigns in a single query (more efficient)
      const campaignIds = (campaigns as any[]).map(c => c.id);

      let platformsMap = new Map();
      let trackingCodesMap = new Map(); // Map: campaign_id -> array of tracking codes (active only, for display)
      let trackingCodesMapForAnalytics = new Map(); // Map: campaign_id -> array of tracking codes (includes hidden, for analytics)
      let utmCampaignsMapForAnalytics = new Map(); // Map: campaign_id -> array of unique utm_campaign names (includes hidden, for analytics)

      if (campaignIds.length > 0) {
        const placeholders = campaignIds.map(() => '?').join(',');

        // Fetch platforms (unique source/medium combinations) - ONLY active for display
        const [allPlatforms] = await pool.execute(
          `SELECT campaign_id, utm_source, utm_medium 
         FROM utm_codes 
         WHERE campaign_id IN (${placeholders}) AND status != 'hidden'
         GROUP BY campaign_id, utm_source, utm_medium
         ORDER BY campaign_id, utm_source`,
          campaignIds
        );

        // Fetch ALL tracking codes for each campaign (not just the first one) - ONLY active for display
        const [allTrackingCodes] = await pool.execute(
          `SELECT campaign_id, tracking_code 
         FROM utm_codes
         WHERE campaign_id IN (${placeholders}) AND status != 'hidden'
         ORDER BY campaign_id`,
          campaignIds
        );

        // Fetch ALL tracking codes INCLUDING hidden for analytics calculations (preserve legacy data)
        // Also fetch utm_campaign for legacy data fallback matching
        const [allTrackingCodesForAnalytics] = await pool.execute(
          `SELECT campaign_id, tracking_code, utm_campaign 
         FROM utm_codes
         WHERE campaign_id IN (${placeholders})
         ORDER BY campaign_id`,
          campaignIds
        );

        // Group platforms by campaign_id
        (allPlatforms as any[]).forEach(platform => {
          if (!platformsMap.has(platform.campaign_id)) {
            platformsMap.set(platform.campaign_id, []);
          }
          platformsMap.get(platform.campaign_id).push({
            utm_source: platform.utm_source,
            utm_medium: platform.utm_medium
          });
        });

        // Group tracking codes by campaign_id (active only, for display)
        (allTrackingCodes as any[]).forEach(tc => {
          if (!trackingCodesMap.has(tc.campaign_id)) {
            trackingCodesMap.set(tc.campaign_id, []);
          }
          trackingCodesMap.get(tc.campaign_id).push(tc.tracking_code);
        });

        // Group tracking codes by campaign_id (includes hidden, for analytics)
        (allTrackingCodesForAnalytics as any[]).forEach(tc => {
          if (!trackingCodesMapForAnalytics.has(tc.campaign_id)) {
            trackingCodesMapForAnalytics.set(tc.campaign_id, []);
          }
          trackingCodesMapForAnalytics.get(tc.campaign_id).push(tc.tracking_code);
        });

        // Group utm_campaign names by campaign_id (includes hidden, for analytics legacy data fallback)
        (allTrackingCodesForAnalytics as any[]).forEach(tc => {
          if (tc.utm_campaign && tc.utm_campaign !== '') {
            if (!utmCampaignsMapForAnalytics.has(tc.campaign_id)) {
              utmCampaignsMapForAnalytics.set(tc.campaign_id, new Set());
            }
            utmCampaignsMapForAnalytics.get(tc.campaign_id).add(tc.utm_campaign);
          }
        });
      }

      // Get analytics data from ClickHouse for these campaigns
      let analyticsMap = new Map();

      // Initialize analytics maps outside the block so they're accessible for summary calculation
      // These maps contain data for ALL tracking codes, not just the paginated campaigns
      const trackingCodeClicks = new Map();
      const campaignVisitorsMap = new Map<number, number>();

      // Fetch analytics data from ClickHouse (for all tracking codes, not just paginated campaigns)
      // This data will be used both for paginated campaigns and for summary calculation
      try {
        // Query 1: Get CLICKS from materialized view (redirect clicks) - ALL tracking codes
        // Query buffer table directly for real-time data (includes both pending and flushed data)
        // This follows GA's approach: query pre-aggregated data, fast inserts
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 90); // Last 90 days
        const startDateStr = startDate.toISOString().split('T')[0];

        const clicksQuery = await queryWithMemoryLimit(`
          SELECT 
            tracking_code,
            COUNT(*) as total_clicks
          FROM analytics.tracking_events_buffer
          WHERE tracking_code != ''
            AND toDate(toTimeZone(timestamp, 'Asia/Seoul')) >= toDate('${startDateStr}')
            AND toDate(toTimeZone(timestamp, 'Asia/Seoul')) <= toDate('${endDate}')
          GROUP BY tracking_code
        `, { format: 'JSONEachRow' });

        const clicksResults = await clicksQuery.json() as any[];
        clicksResults.forEach((result: any) => {
          trackingCodeClicks.set(result.tracking_code, parseInt(result.total_clicks));
        });

        // Query 2: Get UNIQUE VISITORS per campaign (deduped across all UTMs per campaign)
        if (campaignIds.length > 0) {
          try {
            const campaignIdList = campaignIds.join(',');

            // Add date filtering (default to last 90 days, enforce max 90 days)
            // Use searchParams directly to avoid variable shadowing
            const MAX_RANGE_DAYS = 90;
            const queryEndDate = searchParams.get('end_date') || '';
            const queryStartDate = searchParams.get('start_date') || '';

            let finalEndDateStr = queryEndDate || new Date().toISOString().split('T')[0];
            let finalStartDateStr: string = queryStartDate;

            if (!finalStartDateStr) {
              const endDateObj = new Date(finalEndDateStr);
              const startDateObj = new Date(endDateObj);
              startDateObj.setDate(startDateObj.getDate() - MAX_RANGE_DAYS);
              finalStartDateStr = startDateObj.toISOString().split('T')[0];
            }

            // Enforce maximum date window
            const startObj = new Date(finalStartDateStr);
            const endObj = new Date(finalEndDateStr);
            const diffMs = endObj.getTime() - startObj.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays > MAX_RANGE_DAYS) {
              const clampedStartObj = new Date(endObj);
              clampedStartObj.setDate(clampedStartObj.getDate() - MAX_RANGE_DAYS);
              finalStartDateStr = clampedStartObj.toISOString().split('T')[0];
            }

            // Build date filter clause
            const dateFilter = `AND toDate(toTimeZone(timestamp, 'Asia/Seoul')) >= toDate('${finalStartDateStr}') AND toDate(toTimeZone(timestamp, 'Asia/Seoul')) <= toDate('${finalEndDateStr}')`;

            // Build a mapping of campaign_id -> tracking_codes (for legacy fallback)
            const trackingCodesByCampaign: Record<number, string[]> = {};
            trackingCodesMapForAnalytics.forEach((codes, cid) => {
              trackingCodesByCampaign[cid] = (codes || []).map((c: string) => c?.trim()).filter(Boolean);
            });

            // Optional: build utm_campaigns by campaign for legacy names
            const utmCampaignsByCampaign: Record<number, string[]> = {};
            utmCampaignsMapForAnalytics.forEach((names, cid) => {
              utmCampaignsByCampaign[cid] = Array.from(names || []);
            });

            // Prepare a flat list of (campaign_id, tracking_code) pairs for JOIN
            const campaignCodePairs: Array<{ campaign_id: number; code: string }> = [];
            Object.entries(trackingCodesByCampaign).forEach(([cid, codes]) => {
              const cidNum = parseInt(cid, 10);
              codes.forEach((code) => {
                if (code) {
                  campaignCodePairs.push({ campaign_id: cidNum, code });
                }
              });
            });

            // If no codes, fall back to campaign_id only query
            if (campaignCodePairs.length === 0) {
              const visitorsByCampaignId = await queryWithMemoryLimit(`
                  SELECT campaign_id, countDistinct(user_id) as unique_visitors
                  FROM analytics.visit_logs_buffer
                  WHERE campaign_id IN (${campaignIdList})
                    AND utm_source != '' AND utm_source != 'Direct' AND utm_source != '(direct)'
                    ${dateFilter}
                  GROUP BY campaign_id
                `, { format: 'JSONEachRow' });
              const visitorsByCampaignData = await visitorsByCampaignId.json() as any[];
              visitorsByCampaignData.forEach((row: any) => {
                if (row.campaign_id) {
                  campaignVisitorsMap.set(parseInt(row.campaign_id), parseInt(row.unique_visitors || '0'));
                }
              });
            } else {
              // Build inline tables using SELECT ... UNION ALL to satisfy ClickHouse syntax
              const campaignCodesInline = campaignCodePairs
                .map(({ campaign_id, code }) => `SELECT ${campaign_id} AS campaign_id, '${code.replace(/'/g, "\\'")}' AS tracking_code`)
                .join(' UNION ALL ');

              const campaignUtmPairs: Array<{ campaign_id: number; utm_campaign: string }> = [];
              Object.entries(utmCampaignsByCampaign).forEach(([cid, utmNames]) => {
                const cidNum = parseInt(cid, 10);
                utmNames.forEach((name) => {
                  if (name) {
                    campaignUtmPairs.push({ campaign_id: cidNum, utm_campaign: name });
                  }
                });
              });

              const campaignUtmsInline = campaignUtmPairs.length
                ? campaignUtmPairs
                  .map(({ campaign_id, utm_campaign }) => `SELECT ${campaign_id} AS campaign_id, '${utm_campaign.replace(/'/g, "\\'")}' AS utm_campaign`)
                  .join(' UNION ALL ')
                : '';

              // Main query: distinct users per campaign from (campaign_id match) OR (tracking_code join) OR (legacy utm_campaign match when tracking_code empty)
              const visitorsQuery = `
                WITH
                  campaign_codes AS (
                    ${campaignCodesInline}
                  )
                  ${campaignUtmsInline ? `, campaign_utms AS (
                    ${campaignUtmsInline}
                  )` : ''}
                SELECT
                  campaign_id,
                  countDistinct(user_id) AS unique_visitors
                FROM (
                  SELECT user_id, campaign_id
                  FROM analytics.visit_logs_buffer
                  WHERE campaign_id IN (${campaignIdList})
                    AND utm_source != '' AND utm_source != 'Direct' AND utm_source != '(direct)'
                    ${dateFilter}

                  UNION ALL

                  SELECT v.user_id, cc.campaign_id
                  FROM analytics.visit_logs_buffer v
                  INNER JOIN campaign_codes cc ON v.tracking_code = cc.tracking_code
                  WHERE v.tracking_code != ''
                    AND v.tracking_code IS NOT NULL
                    AND utm_source != '' AND utm_source != 'Direct' AND utm_source != '(direct)'
                    ${dateFilter}
                  ${campaignUtmsInline ? `
                  UNION ALL

                  SELECT v.user_id, cu.campaign_id
                  FROM analytics.visit_logs_buffer v
                  INNER JOIN campaign_utms cu ON v.utm_campaign = cu.utm_campaign
                  WHERE (v.tracking_code = '' OR v.tracking_code IS NULL)
                    AND v.utm_campaign != ''
                    AND utm_source != '' AND utm_source != 'Direct' AND utm_source != '(direct)'
                    ${dateFilter}
                  ` : ''}
                )
                GROUP BY campaign_id
              `;

              const visitorsResult = await queryWithMemoryLimit(visitorsQuery, {
                format: 'JSONEachRow'
              });
              const visitorsData = await visitorsResult.json() as any[];
              visitorsData.forEach((row: any) => {
                if (row.campaign_id) {
                  campaignVisitorsMap.set(parseInt(row.campaign_id), parseInt(row.unique_visitors || '0'));
                }
              });
            }
          } catch (error) {
            console.error('Error fetching deduped visitors by campaign:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching analytics data from ClickHouse:', error);
        // Continue without analytics data
      }

      // Detect legacy data BEFORE processing campaigns (more efficient)
      // Build maps of legacy clicks and tracking codes for all campaigns at once
      const legacyClicksByCampaign = new Map<number, number>();
      const legacyTrackingCodesByCampaign = new Map<number, Set<string>>();

      if (campaignIds.length > 0) {
        try {
          // Get all tracking codes from MySQL for all campaigns (for comparison)
          const placeholders = campaignIds.map(() => '?').join(',');
          const [allUtmCodes] = await pool.execute(
            `SELECT campaign_id, tracking_code FROM utm_codes WHERE campaign_id IN (${placeholders})`,
            campaignIds
          );
          const allTrackingCodesInMySQL = new Set<string>();
          const trackingCodesByCampaignId = new Map<number, Set<string>>();

          (allUtmCodes as any[]).forEach(utm => {
            if (utm.tracking_code && utm.tracking_code !== '') {
              allTrackingCodesInMySQL.add(utm.tracking_code);

              if (!trackingCodesByCampaignId.has(utm.campaign_id)) {
                trackingCodesByCampaignId.set(utm.campaign_id, new Set());
              }
              trackingCodesByCampaignId.get(utm.campaign_id)!.add(utm.tracking_code);
            }
          });

          // Get campaign names for matching
          const campaignNamesMap = new Map<number, string>();
          (campaigns as any[]).forEach(c => {
            campaignNamesMap.set(c.id, c.name);
          });

          // Check for legacy clicks from hard-deleted UTMs (matching by utm_campaign)
          try {
            const campaignNames = Array.from(campaignNamesMap.values()).filter(Boolean);
            if (campaignNames.length > 0) {
              const campaignNamesList = campaignNames.map(c => `'${c.replace(/'/g, "\\'")}'`).join(',');

              const legacyClicksCheck = await queryWithMemoryLimit(`
                SELECT 
                  utm_campaign,
                  tracking_code,
                  COUNT(*) as total_clicks
                FROM analytics.tracking_events_buffer
                WHERE utm_campaign IN (${campaignNamesList})
                  AND tracking_code != ''
                  AND tracking_code IS NOT NULL
                GROUP BY utm_campaign, tracking_code
              `, {
                format: 'JSONEachRow'
              });

              const legacyClicksData = await legacyClicksCheck.json() as any[];

              legacyClicksData.forEach((result: any) => {
                const code = result.tracking_code;
                const legacyClicks = parseInt(result.total_clicks || '0');
                const campaignName = result.utm_campaign;

                // If this tracking code is not in MySQL records, it's legacy data
                if (code && !allTrackingCodesInMySQL.has(code) && legacyClicks > 0 && campaignName) {
                  // Find campaign ID by name
                  for (const [campaignId, name] of Array.from(campaignNamesMap.entries())) {
                    if (name === campaignName) {
                      const current = legacyClicksByCampaign.get(campaignId) || 0;
                      legacyClicksByCampaign.set(campaignId, current + legacyClicks);

                      if (!legacyTrackingCodesByCampaign.has(campaignId)) {
                        legacyTrackingCodesByCampaign.set(campaignId, new Set());
                      }
                      legacyTrackingCodesByCampaign.get(campaignId)!.add(code);
                      break;
                    }
                  }
                }
              });
            }

            // Check visit_logs for tracking codes that don't exist in MySQL (hard-deleted UTMs)
            if (campaignIds.length > 0) {
              const campaignIdsList = campaignIds.join(',');
              const clickhouseTrackingCodesQuery = await queryWithMemoryLimit(`
                SELECT DISTINCT campaign_id, tracking_code
                FROM analytics.visit_logs_buffer
                WHERE campaign_id IN (${campaignIdsList})
                  AND tracking_code != ''
                  AND tracking_code IS NOT NULL
              `, {
                format: 'JSONEachRow'
              });

              const clickhouseTrackingCodesData = await clickhouseTrackingCodesQuery.json() as Array<{ campaign_id: number; tracking_code: string }>;

              clickhouseTrackingCodesData.forEach(row => {
                const code = row.tracking_code?.trim() || row.tracking_code;
                const campaignId = row.campaign_id;

                if (code && code !== '' && campaignId) {
                  const mysqlCodes = trackingCodesByCampaignId.get(campaignId) || new Set();

                  // If tracking code exists in ClickHouse but not in MySQL, it's legacy data
                  if (!mysqlCodes.has(code)) {
                    if (!legacyTrackingCodesByCampaign.has(campaignId)) {
                      legacyTrackingCodesByCampaign.set(campaignId, new Set());
                    }
                    legacyTrackingCodesByCampaign.get(campaignId)!.add(code);
                  }
                }
              });
            }
          } catch (error) {
            console.error('Error detecting legacy data:', error);
          }
        } catch (error) {
          console.error('Error preparing legacy data detection:', error);
        }
      }

      if (campaignIds.length > 0) {
        try {
          // Aggregate analytics for ALL tracking codes per campaign (INCLUDING hidden for legacy data)
          (campaigns as any[]).forEach(campaign => {
            // Use analytics map which includes hidden UTMs
            const trackingCodesForAnalytics = trackingCodesMapForAnalytics.get(campaign.id) || [];
            let totalClicks = 0;
            let totalVisitors = 0;
            const clicksFromLegacy = legacyClicksByCampaign.get(campaign.id) || 0;
            const hasLegacy = (legacyTrackingCodesByCampaign.get(campaign.id)?.size || 0) > 0 || clicksFromLegacy > 0;

            // Sum clicks from all tracking codes (including hidden)
            trackingCodesForAnalytics.forEach((trackingCode: string) => {
              const code = trackingCode?.trim() || trackingCode;

              // Try exact match first (trimmed)
              if (trackingCodeClicks.has(code)) {
                totalClicks += trackingCodeClicks.get(code);
              }

              // Also try original (untrimmed) if different
              if (code !== trackingCode && trackingCodeClicks.has(trackingCode)) {
                totalClicks += trackingCodeClicks.get(trackingCode);
              }
            });

            // Add legacy clicks
            totalClicks += clicksFromLegacy;

            // Get visitors directly from campaign_id query (matches detail page)
            totalVisitors = campaignVisitorsMap.get(campaign.id) || 0;

            // Always set analytics, even if 0, so campaigns show up
            analyticsMap.set(campaign.id, {
              clicks: totalClicks,
              visitors: totalVisitors,
              hasLegacyData: hasLegacy,
              clicksFromLegacyData: clicksFromLegacy
            });
          });

          // Fallback: If visitors are still 0 but we have clicks, try matching by UTM parameters
          // This handles edge cases where visit_logs might not match by campaign_id
          // (Note: Most legacy data is now handled in the main query above)
          if (campaignVisitorsMap.size === 0 ||
            Array.from(analyticsMap.values()).every(a => a.visitors === 0)) {
            try {
              // Get all campaign IDs from the campaigns we're processing
              const allCampaignIds = (campaigns as any[]).map(c => c.id);

              if (allCampaignIds.length > 0) {
                // Get UTM parameters for campaigns
                const placeholders = allCampaignIds.map(() => '?').join(',');
                const [utmData] = await pool.execute(
                  `SELECT campaign_id, utm_campaign, utm_source, utm_medium 
                 FROM utm_codes 
                 WHERE campaign_id IN (${placeholders}) AND status != 'hidden'`,
                  allCampaignIds
                ) as [Array<{ campaign_id: number; utm_campaign: string; utm_source: string; utm_medium: string }>, any];

                if (utmData.length > 0) {
                  // Query visitors by UTM parameters
                  const utmVisitorsQuery = await queryWithMemoryLimit(`
                    SELECT 
                      utm_campaign,
                      utm_source,
                      utm_medium,
                      countDistinct(user_id) as unique_visitors
                    FROM analytics.visit_logs_buffer
                    WHERE utm_campaign != '' AND (tracking_code = '' OR tracking_code IS NULL)
                    GROUP BY utm_campaign, utm_source, utm_medium
                  `, { format: 'JSONEachRow' });

                  const utmVisitorsResults = await utmVisitorsQuery.json() as any[];

                  // Match UTM visitors to campaigns
                  utmVisitorsResults.forEach((result: any) => {
                    const matchingUtm = utmData.find(utm =>
                      utm.utm_campaign === result.utm_campaign &&
                      utm.utm_source === result.utm_source &&
                      utm.utm_medium === result.utm_medium
                    );

                    if (matchingUtm) {
                      const existing = analyticsMap.get(matchingUtm.campaign_id) || { clicks: 0, visitors: 0 };
                      analyticsMap.set(matchingUtm.campaign_id, {
                        clicks: existing.clicks,
                        visitors: existing.visitors + parseInt(result.unique_visitors)
                      });
                    }
                  });
                }
              }
            } catch (utmError) {
              console.warn('⚠️ UTM parameter fallback for visitors failed:', utmError);
            }
          }

        } catch (error) {
          console.error('Error fetching campaign analytics from ClickHouse:', error);
          // Continue without analytics data
        }
      }

      // Add platforms, tracking_code, and analytics to each campaign
      const campaignsWithPlatforms = (campaigns as any[]).map(campaign => {
        const analytics = analyticsMap.get(campaign.id) || { clicks: 0, visitors: 0 };
        const ctr = analytics.clicks > 0 && analytics.visitors > 0
          ? ((analytics.visitors / analytics.clicks) * 100).toFixed(1)
          : '0.0';
        const conversionRate = analytics.clicks > 0 && analytics.visitors > 0
          ? ((analytics.visitors / analytics.clicks) * 100).toFixed(1)
          : '0.0';

        // 🎭 DEMO FEATURE: Auto-calculate spent based on clicks ($0.50 per click)
        // TODO: Remove this in production - spent should come from actual ad platform data
        const DEMO_COST_PER_CLICK = 0.50;
        const calculatedSpent = analytics.clicks * DEMO_COST_PER_CLICK;

        // Get first tracking code for display
        const trackingCodes = trackingCodesMap.get(campaign.id) || [];
        const firstTrackingCode = trackingCodes.length > 0 ? trackingCodes[0] : null;

        return {
          ...campaign,
          platforms: platformsMap.get(campaign.id) || [],
          tracking_code: firstTrackingCode, // First tracking code for display
          tracking_codes: trackingCodes, // ALL tracking codes
          clicks: analytics.clicks,
          visitors: analytics.visitors,
          ctr: ctr,
          conversion_rate: conversionRate,
          spent: calculatedSpent, // Override spent with calculated value
          hasLegacyData: analytics.hasLegacyData || false,
          clicksFromLegacyData: analytics.clicksFromLegacyData || 0
        };
      });

      // Calculate summary stats (exclude hidden campaigns - soft deleted)
      // Apply same filters as the main query for consistency
      const summaryQuery = `
      SELECT 
        COUNT(*) as total_campaigns,
        COUNT(CASE WHEN campaigns.status = 'active' THEN 1 END) as active_campaigns,
        COALESCE(SUM(campaigns.budget), 0) as total_budget,
        COALESCE(AVG(campaigns.spent / NULLIF(campaigns.budget, 0)) * 100, 0) as avg_spent_percentage
      FROM campaigns
      LEFT JOIN courses ON campaigns.course_id = courses.id
      WHERE 1=1${whereConditions}
    `;

      const [summaryResult] = await pool.execute(summaryQuery, countParams);
      const summary = (summaryResult as any)[0];

      // Get ALL campaign IDs that match the filters (not just paginated ones)
      // This is needed to calculate total clicks/visitors from all matching campaigns
      const allMatchingCampaignsQuery = `
      SELECT DISTINCT campaigns.id
      FROM campaigns
      LEFT JOIN courses ON campaigns.course_id = courses.id
      WHERE 1=1${whereConditions}
    `;

      const [allMatchingCampaigns] = await pool.execute(allMatchingCampaignsQuery, countParams);
      const allMatchingCampaignIds = (allMatchingCampaigns as any[]).map(c => c.id);

      // Query visitors for ALL matching campaigns using campaign_id + tracking_code fallback
      // This ensures we capture all visitors, even those without campaign_id set
      if (allMatchingCampaignIds.length > 0) {
        try {
          // Get all tracking codes and utm_campaigns for all matching campaigns
          const allPlaceholders = allMatchingCampaignIds.map(() => '?').join(',');
          const [allTrackingCodesForVisitors] = await pool.execute(
            `SELECT campaign_id, tracking_code, utm_campaign 
             FROM utm_codes
             WHERE campaign_id IN (${allPlaceholders})
             ORDER BY campaign_id`,
            allMatchingCampaignIds
          );

          // Group tracking codes by campaign_id
          const trackingCodesByCampaign = new Map<number, string[]>();
          (allTrackingCodesForVisitors as any[]).forEach(tc => {
            if (!trackingCodesByCampaign.has(tc.campaign_id)) {
              trackingCodesByCampaign.set(tc.campaign_id, []);
            }
            trackingCodesByCampaign.get(tc.campaign_id)!.push(tc.tracking_code);
          });

          // Group utm_campaign names by campaign_id (for legacy data fallback)
          const utmCampaignsByCampaign = new Map<number, Set<string>>();
          (allTrackingCodesForVisitors as any[]).forEach(tc => {
            if (tc.utm_campaign && tc.utm_campaign !== '') {
              if (!utmCampaignsByCampaign.has(tc.campaign_id)) {
                utmCampaignsByCampaign.set(tc.campaign_id, new Set());
              }
              utmCampaignsByCampaign.get(tc.campaign_id)!.add(tc.utm_campaign);
            }
          });

          // Bulk visitors for all matching campaigns grouped by campaign_id (no per-campaign loop)
          try {
            const allCampaignIdList = allMatchingCampaignIds.join(',');
            const visitorsAllCampaigns = await queryWithMemoryLimit(`
                SELECT campaign_id, countDistinct(user_id) as unique_visitors
                FROM analytics.visit_logs_buffer
                WHERE campaign_id IN (${allCampaignIdList})
                  AND utm_source != '' AND utm_source != 'Direct' AND utm_source != '(direct)'
                GROUP BY campaign_id
              `, { format: 'JSONEachRow' });
            const visitorsAllCampaignsData = await visitorsAllCampaigns.json() as any[];
            visitorsAllCampaignsData.forEach((row: any) => {
              if (row.campaign_id) {
                const visitors = parseInt(row.unique_visitors || '0');
                if (!campaignVisitorsMap.has(parseInt(row.campaign_id))) {
                  campaignVisitorsMap.set(parseInt(row.campaign_id), visitors);
                }
              }
            });
          } catch (error) {
            console.error('Error fetching visitors for all matching campaigns:', error);
          }
        } catch (error) {
          console.error('Error fetching bulk visitors for all campaigns:', error);
        }
      }

      // Calculate total clicks and visitors from ALL matching campaigns (not just paginated)
      let total_clicks = 0;
      let total_visitors = 0;

      if (allMatchingCampaignIds.length > 0) {
        try {
          // Get all tracking codes for ALL matching campaigns (INCLUDING hidden for legacy data)
          const allPlaceholders = allMatchingCampaignIds.map(() => '?').join(',');
          const [allTrackingCodesForSummary] = await pool.execute(
            `SELECT campaign_id, tracking_code 
           FROM utm_codes
           WHERE campaign_id IN (${allPlaceholders})
           ORDER BY campaign_id`,
            allMatchingCampaignIds
          );

          // Group tracking codes by campaign_id
          const allTrackingCodesMap = new Map();
          (allTrackingCodesForSummary as any[]).forEach(tc => {
            if (!allTrackingCodesMap.has(tc.campaign_id)) {
              allTrackingCodesMap.set(tc.campaign_id, []);
            }
            allTrackingCodesMap.get(tc.campaign_id).push(tc.tracking_code);
          });

          // Get campaign names for legacy matching
          const [allCampaignNames] = await pool.execute(
            `SELECT id, name FROM campaigns WHERE id IN (${allPlaceholders})`,
            allMatchingCampaignIds
          );
          const campaignNamesMap = new Map();
          (allCampaignNames as any[]).forEach(c => {
            campaignNamesMap.set(c.id, c.name);
          });

          // Use the same analytics data we already fetched (it's for all tracking codes)
          // Aggregate clicks and visitors for ALL matching campaigns
          allMatchingCampaignIds.forEach(campaignId => {
            const trackingCodes = allTrackingCodesMap.get(campaignId) || [];
            let campaignClicks = 0;

            trackingCodes.forEach((trackingCode: string) => {
              const code = trackingCode?.trim() || trackingCode;

              if (trackingCodeClicks.has(code)) {
                campaignClicks += trackingCodeClicks.get(code);
              }
              if (code !== trackingCode && trackingCodeClicks.has(trackingCode)) {
                campaignClicks += trackingCodeClicks.get(trackingCode);
              }
            });

            // Use visitor data from campaign_id query (same as detail page)
            const campaignVisitors = campaignVisitorsMap.get(campaignId) || 0;

            total_clicks += campaignClicks;
            total_visitors += campaignVisitors;
          });
        } catch (error) {
          console.error('Error calculating total clicks/visitors for summary:', error);
          // Fallback: use paginated data if error occurs
          campaignsWithPlatforms.forEach(campaign => {
            total_clicks += campaign.clicks || 0;
            total_visitors += campaign.visitors || 0;
          });
        }
      }

      // Calculate total spent based on actual clicks (demo calculation)
      const DEMO_COST_PER_CLICK = 0.50;
      const total_spent = total_clicks * DEMO_COST_PER_CLICK;

      let total_visitors_all_channels = 0;
      try {
        const allChannelVisitorsQuery = await queryWithMemoryLimit(`
        SELECT countDistinct(user_id) as unique_visitors
        FROM analytics.visit_logs_buffer
        WHERE utm_source != ''
        `, { format: 'JSONEachRow' });

        const allChannelData = await allChannelVisitorsQuery.json() as any[];
        if (allChannelData.length > 0) {
          total_visitors_all_channels = parseInt(allChannelData[0].unique_visitors || "0");
        }
      } catch (error) {
        console.warn('Failed to fetch all-channel visitors:', error);
      }

      const responsePayload = {
        success: true,
        campaigns: campaignsWithPlatforms,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        summary: {
          total_campaigns: summary.total_campaigns,
          active_campaigns: summary.active_campaigns,
          total_budget: parseFloat(summary.total_budget),
          total_spent: total_spent,
          total_clicks: total_clicks,
          total_visitors: total_visitors,
          total_visitors_all_channels: total_visitors_all_channels,
          avg_conversion_rate: total_clicks > 0 && total_visitors > 0
            ? parseFloat(((total_visitors / total_clicks) * 100).toFixed(1))
            : 0
        }
      };

      // Cache the full response
      await setCache(cacheKey, responsePayload, cacheTtlMs);

      return NextResponse.json(responsePayload);
    } catch (dbError: any) {
      // Check if table doesn't exist
      if (dbError.code === 'ER_NO_SUCH_TABLE' &&
        (dbError.sqlMessage?.includes('campaigns') || dbError.sqlMessage?.includes('courses'))) {
        console.warn('⚠️ Campaigns or courses table does not exist yet');
        return NextResponse.json({
          success: true,
          campaigns: [],
          pagination: {
            page,
            limit,
            total: 0,
            total_pages: 0
          },
          summary: {
            total_campaigns: 0,
            active_campaigns: 0,
            total_budget: 0,
            total_spent: 0,
            total_clicks: 0,
            total_visitors: 0,
            total_visitors_all_channels: 0,
            avg_conversion_rate: 0
          },
          message: 'No campaigns data available yet. Database tables will be created automatically.'
        });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      {
        success: true,
        campaigns: [],
        pagination: {
          page,
          limit,
          total: 0,
          total_pages: 0
        },
        summary: {
          total_campaigns: 0,
          active_campaigns: 0,
          total_budget: 0,
          total_spent: 0,
          total_clicks: 0,
          total_visitors: 0,
          total_visitors_all_channels: 0,
          avg_conversion_rate: 0
        },
        message: 'Unable to fetch campaigns data. Please try again later.'
      },
      { status: 200 }
    );
  }
});

export async function POST(request: NextRequest) {
  try {
    // Defensive JSON parsing - prevents 500 errors from truncated bodies during deployment
    const { error, body } = await parseRequestBody(request);
    if (error) return error;

    const {
      name,
      utm_name,  // Added: Name for the tracking link
      course_id,
      source,
      medium,
      status,
      start_date,
      end_date,
      budget,
      auto_pause_on_budget,
      description,
      landing_url,
      utm_campaign,
      utm_source,
      utm_medium,
      utm_term,
      utm_content
    } = body;

    // Validation
    if (!name || !course_id || !source || !medium || !start_date || !end_date || !budget) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate and sanitize status value
    const validStatuses = ['active', 'waiting', 'ended', 'paused', 'hidden'];
    const sanitizedStatus = status && validStatuses.includes(status) ? status : 'active';

    const pool = getPool();
    const query = `
      INSERT INTO campaigns (name, course_id, source, medium, status, start_date, end_date, budget, auto_pause_on_budget, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [
      name,
      course_id,
      source,
      medium,
      sanitizedStatus,
      start_date,
      end_date,
      budget,
      auto_pause_on_budget ? 1 : 0,
      description || null
    ]);

    const insertId = (result as any).insertId;

    // Auto-generate tracking link if landing_url is provided
    // Use campaign name as utm_campaign if not provided, and use source/medium from form
    let trackingLink = null;
    if (landing_url) {
      try {
        // Use campaign name as utm_campaign if not explicitly provided
        const finalUtmCampaign = utm_campaign || name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        // Use form source/medium if provided and not 'select', otherwise use campaign defaults
        const finalUtmSource = (utm_source && utm_source !== 'select') ? utm_source : source;
        const finalUtmMedium = (utm_medium && utm_medium !== 'select') ? utm_medium : medium;

        // Only generate if we have valid source and medium
        if (finalUtmSource && finalUtmSource !== 'select' && finalUtmMedium && finalUtmMedium !== 'select') {
          // Auto-generate UTM name if not provided
          const finalUtmName = utm_name || `${name}_${finalUtmSource}_${finalUtmMedium}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');

          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const trackingResponse = await fetch(`${appUrl}/api/tracking/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: finalUtmName,  // Pass the UTM name
              campaignName: name,
              campaignId: insertId,
              targetUrl: landing_url,
              utmSource: finalUtmSource,
              utmMedium: finalUtmMedium,
              utmCampaign: finalUtmCampaign,
              utmContent: utm_content || '',
              utmTerm: utm_term || ''
            })
          });

          const trackingData = await trackingResponse.json();
          if (trackingData.success) {
            trackingLink = trackingData.trackingLink;
            console.log('✅ Tracking link generated:', trackingLink.trackingCode);
          }
        }
      } catch (error) {
        console.error('Failed to generate tracking link:', error);
        // Don't fail the campaign creation if tracking link generation fails
      }
    }

    // Fetch the created campaign
    const [campaigns] = await pool.execute(
      'SELECT campaigns.*, courses.name as course_name FROM campaigns LEFT JOIN courses ON campaigns.course_id = courses.id WHERE campaigns.id = ?',
      [insertId]
    );

    return NextResponse.json({
      success: true,
      campaign: (campaigns as any)[0],
      trackingLink: trackingLink
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}

