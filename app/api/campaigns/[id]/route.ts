import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import clickhouse from '@/lib/clickhouse';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    console.log(`📋 Campaign Detail API - Campaign ID: ${id}`);
    const pool = getPool();

    const [campaigns] = await pool.execute(
      'SELECT campaigns.*, courses.name as course_name, courses.code as course_code FROM campaigns LEFT JOIN courses ON campaigns.course_id = courses.id WHERE campaigns.id = ?',
      [id]
    );

    if ((campaigns as any[]).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const campaign = (campaigns as any)[0];

    // Fetch ALL tracking codes and UTM campaign names for this campaign (INCLUDING hidden for analytics)
    const [trackingCodesForAnalytics] = await pool.execute(
      'SELECT tracking_code, utm_campaign FROM utm_codes WHERE campaign_id = ?',
      [id]
    );

    // Fetch ONLY active tracking codes for display
    const [trackingCodesForDisplay] = await pool.execute(
      'SELECT tracking_code, utm_campaign FROM utm_codes WHERE campaign_id = ? AND status = "active"',
      [id]
    );

    // Use ALL tracking codes (including hidden) for analytics calculations
    const trackingCodesList = (trackingCodesForAnalytics as any[]).map(tc => tc.tracking_code).filter(code => code && code !== '');
    const utmCampaigns = Array.from(new Set((trackingCodesForAnalytics as any[]).map(tc => tc.utm_campaign).filter(Boolean)));

    // Fetch analytics from ClickHouse for ALL tracking codes + legacy data
    let clicks = 0;
    let visitors = 0;
    let clicksFromLegacyData = 0;

    // Get clicks from tracking_events for active tracking codes
    if (trackingCodesList.length > 0) {
      const placeholders = trackingCodesList.map((_, i) => `{code${i}:String}`).join(',');
      const queryParams: any = {};
      trackingCodesList.forEach((code, i) => {
        queryParams[`code${i}`] = code;
      });

      const clicksQuery = await clickhouse.query({
        query: `
          SELECT 
            tracking_code,
            COUNT(*) as total_clicks
          FROM analytics.tracking_events
          WHERE tracking_code IN (${placeholders})
          GROUP BY tracking_code
        `,
        query_params: queryParams,
        format: 'JSONEachRow'
      });

      const clicksData = await clicksQuery.json() as any[];
      clicksData.forEach((result: any) => {
        clicks += parseInt(result.total_clicks || '0');
      });
    }

    // Also get clicks from legacy data (hard-deleted UTMs) by matching utm_campaign name
    // This captures clicks from UTMs that were hard-deleted but still have data in ClickHouse
    if (utmCampaigns.length > 0) {
      try {
        // Get all tracking codes from ClickHouse that match this campaign's utm_campaign name
        // but are NOT in the active tracking codes list (indicating hard-deleted UTMs)
        const utmCampaignsList = utmCampaigns.map(c => `'${c.replace(/'/g, "\\'")}'`).join(',');

        const legacyClicksQuery = await clickhouse.query({
          query: `
            SELECT 
              tracking_code,
              COUNT(*) as total_clicks
            FROM analytics.tracking_events
            WHERE utm_campaign IN (${utmCampaignsList})
              AND tracking_code != ''
              AND tracking_code IS NOT NULL
            GROUP BY tracking_code
          `,
          format: 'JSONEachRow'
        });

        const legacyClicksData = await legacyClicksQuery.json() as any[];
        const activeTrackingCodesSet = new Set(trackingCodesList);

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

    // Get unique visitors from visit_logs (include both tracking codes AND legacy data)
    // Use campaign_id (denormalized) as primary method, with fallbacks for legacy data
    // Match campaign-analysis API approach
    let visitorsQuery: string;

    if (trackingCodesList.length === 0 && utmCampaigns.length > 0) {
      // Fallback: only legacy data available (use campaign_id OR utm_campaign)
      const utmCampaignsList = utmCampaigns.map(c => `'${c.replace(/'/g, "\\'")}'`).join(',');
      visitorsQuery = `
        SELECT 
          countDistinct(user_id) as unique_visitors
        FROM analytics.visit_logs
        WHERE (campaign_id = ${id} OR (utm_campaign IN (${utmCampaignsList}) AND (tracking_code = '' OR tracking_code IS NULL)))
          AND utm_source != '' AND utm_source != 'Direct' AND utm_source != '(direct)'
      `;
    } else if (trackingCodesList.length > 0 && utmCampaigns.length > 0) {
      // Both tracking codes and legacy data (use campaign_id OR tracking_code OR utm_campaign)
      const trackingCodesListEscaped = trackingCodesList.map(code => `'${code.replace(/'/g, "\\'")}'`).join(',');
      const utmCampaignsList = utmCampaigns.map(c => `'${c.replace(/'/g, "\\'")}'`).join(',');

      visitorsQuery = `
        SELECT 
          countDistinct(user_id) as unique_visitors
        FROM analytics.visit_logs
        WHERE (campaign_id = ${id} OR tracking_code IN (${trackingCodesListEscaped}) OR (tracking_code = '' AND utm_campaign IN (${utmCampaignsList})))
          AND utm_source != '' AND utm_source != 'Direct' AND utm_source != '(direct)'
      `;
    } else if (trackingCodesList.length > 0) {
      // Only tracking codes (use campaign_id OR tracking_code)
      const trackingCodesListEscaped = trackingCodesList.map(code => `'${code.replace(/'/g, "\\'")}'`).join(',');

      visitorsQuery = `
        SELECT 
          countDistinct(user_id) as unique_visitors
        FROM analytics.visit_logs
        WHERE (campaign_id = ${id} OR tracking_code IN (${trackingCodesListEscaped}))
          AND utm_source != '' AND utm_source != 'Direct' AND utm_source != '(direct)'
      `;
    } else {
      // No tracking codes, try campaign_id only
      visitorsQuery = `
        SELECT 
          countDistinct(user_id) as unique_visitors
        FROM analytics.visit_logs
        WHERE campaign_id = ${id}
          AND utm_source != '' AND utm_source != 'Direct' AND utm_source != '(direct)'
      `;
    }

    if (visitorsQuery) {
      const visitorsResult = await clickhouse.query({
        query: visitorsQuery,
        format: 'JSONEachRow'
      });

      const visitorsData = await visitorsResult.json() as any[];
      if (visitorsData.length > 0) {
        visitors = parseInt((visitorsData[0] as any).unique_visitors || '0');
      }
    }



    // Calculate CTR and Conversion Rate
    const ctr = clicks > 0 && visitors > 0
      ? ((visitors / clicks) * 100).toFixed(1)
      : '0.0';
    const conversionRate = clicks > 0 && visitors > 0
      ? ((visitors / clicks) * 100).toFixed(1)
      : '0.0';

    // 🎭 DEMO FEATURE: Auto-calculate spent based on clicks ($0.50 per click)
    // TODO: Remove this in production - spent should come from actual ad platform data
    const DEMO_COST_PER_CLICK = 0.50;
    const calculatedSpent = clicks * DEMO_COST_PER_CLICK;

    // Detect legacy data by querying ClickHouse for tracking codes that have data for this campaign
    let hasLegacyData = false;
    let activeTrackingLinksCount = (trackingCodesForDisplay as any[]).length;

    try {
      // Get active tracking codes from MySQL (including hidden for comparison)
      const allTrackingCodesInMySQL = new Set(
        (trackingCodesForAnalytics as any[]).map(tc => tc.tracking_code).filter(code => code && code !== '')
      );
      const activeTrackingCodes = new Set(
        (trackingCodesForDisplay as any[]).map(tc => tc.tracking_code).filter(code => code && code !== '')
      );

      // Get all distinct tracking codes from ClickHouse visit_logs that have data for this campaign
      // This includes data from hard-deleted UTMs (campaign_id is stored in ClickHouse)
      const clickhouseTrackingCodesFromVisits = new Set<string>();
      try {
        const clickhouseTrackingCodesQuery = await clickhouse.query({
          query: `
            SELECT DISTINCT tracking_code
            FROM analytics.visit_logs
            WHERE campaign_id = ${id}
              AND tracking_code != ''
              AND tracking_code IS NOT NULL
          `,
          format: 'JSONEachRow'
        });

        const clickhouseTrackingCodesData = await clickhouseTrackingCodesQuery.json() as Array<{ tracking_code: string }>;
        clickhouseTrackingCodesData.forEach(row => {
          if (row.tracking_code && row.tracking_code !== '') {
            clickhouseTrackingCodesFromVisits.add(row.tracking_code);
          }
        });
      } catch (error) {
        console.error('Error fetching tracking codes from visit_logs:', error);
      }

      // Get all distinct tracking codes from ClickHouse tracking_events (by utm_campaign match)
      const clickhouseTrackingCodesFromClicks = new Set<string>();
      if (utmCampaigns.length > 0) {
        try {
          const utmCampaignsList = utmCampaigns.map(c => `'${c.replace(/'/g, "\\'")}'`).join(',');
          const clickhouseClicksQuery = await clickhouse.query({
            query: `
              SELECT DISTINCT tracking_code
              FROM analytics.tracking_events
              WHERE utm_campaign IN (${utmCampaignsList})
                AND tracking_code != ''
                AND tracking_code IS NOT NULL
            `,
            format: 'JSONEachRow'
          });

          const clickhouseClicksData = await clickhouseClicksQuery.json() as Array<{ tracking_code: string }>;
          clickhouseClicksData.forEach(row => {
            if (row.tracking_code && row.tracking_code !== '') {
              clickhouseTrackingCodesFromClicks.add(row.tracking_code);
            }
          });
        } catch (error) {
          console.error('Error fetching tracking codes from tracking_events:', error);
        }
      }

      // Combine all tracking codes from ClickHouse
      const allClickhouseTrackingCodes = new Set([
        ...Array.from(clickhouseTrackingCodesFromVisits),
        ...Array.from(clickhouseTrackingCodesFromClicks)
      ]);

      // Check if there are tracking codes in ClickHouse that don't exist in MySQL
      // This indicates legacy data (hard-deleted UTMs)
      for (const code of Array.from(allClickhouseTrackingCodes)) {
        if (!allTrackingCodesInMySQL.has(code)) {
          hasLegacyData = true;
          break;
        }
      }

      // Also check if we have clicks from legacy data (calculated earlier)
      if (clicksFromLegacyData > 0) {
        hasLegacyData = true;
      }

      // Check if we have visitors/clicks via campaign_id but no matching active tracking codes
      // This happens when UTMs were hard-deleted but campaign_id is stored in ClickHouse
      if (allClickhouseTrackingCodes.size > 0 && activeTrackingCodes.size === 0 && clicks > 0) {
        hasLegacyData = true;
      }

      // Check if we have visitors/clicks but no matching active tracking codes
      // This could indicate legacy data matched by utm_campaign name
      if ((visitors > 0 || clicks > 0) && activeTrackingCodes.size === 0 && trackingCodesList.length === 0) {
        hasLegacyData = true;
      }

      // If total tracking codes in ClickHouse > active tracking codes, we have legacy data
      if (allClickhouseTrackingCodes.size > activeTrackingCodes.size) {
        hasLegacyData = true;
      }

      // If we have more tracking codes in ClickHouse than in MySQL (including hidden), we have legacy data
      if (allClickhouseTrackingCodes.size > allTrackingCodesInMySQL.size) {
        hasLegacyData = true;
      }

    } catch (error) {
      console.error('Error checking for legacy data:', error);
      // Continue without legacy data detection - assume no legacy data if check fails
      // But if we detected legacy clicks earlier, still flag it
      if (clicksFromLegacyData > 0) {
        hasLegacyData = true;
      }
    }

    return NextResponse.json({
      success: true,
      campaign: {
        ...campaign,
        clicks,
        visitors,
        ctr,
        conversion_rate: conversionRate,
        spent: calculatedSpent, // Override spent with calculated value
        hasLegacyData, // Flag indicating if legacy data is included
        activeTrackingLinksCount, // Count of active tracking links for display
        clicksFromLegacyData // Number of clicks from hard-deleted UTMs (for display)
      }
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    const {
      name,
      course_id,
      source,
      medium,
      status,
      start_date,
      end_date,
      budget,
      auto_pause_on_budget,
      description
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Campaign name is required' },
        { status: 400 }
      );
    }

    // Validate and sanitize status value
    const validStatuses = ['active', 'waiting', 'ended', 'paused', 'hidden'];
    const sanitizedStatus = status && validStatuses.includes(status) ? status : 'active';

    const pool = getPool();
    const query = `
      UPDATE campaigns 
      SET name = ?, course_id = ?, source = ?, medium = ?, status = ?, 
          start_date = ?, end_date = ?, budget = ?, auto_pause_on_budget = ?, description = ?
      WHERE id = ?
    `;

    await pool.execute(query, [
      name,
      course_id || null,
      source || null,
      medium || null,
      sanitizedStatus,
      start_date || null,
      end_date || null,
      budget || null,
      auto_pause_on_budget ? 1 : 0,
      description || null,
      id
    ]);

    // Fetch updated campaign
    const [campaigns] = await pool.execute(
      'SELECT campaigns.*, courses.name as course_name FROM campaigns LEFT JOIN courses ON campaigns.course_id = courses.id WHERE campaigns.id = ?',
      [id]
    );

    return NextResponse.json({
      success: true,
      campaign: (campaigns as any)[0]
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const pool = getPool();

    // Soft delete - set status to 'hidden' instead of deleting
    await pool.execute(
      'UPDATE campaigns SET status = ? WHERE id = ?',
      ['hidden', id]
    );

    return NextResponse.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}

