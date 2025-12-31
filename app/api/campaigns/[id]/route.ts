import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import clickhouse, { queryWithMemoryLimit } from '@/lib/clickhouse';
import { requirePermissionWithParams, type AuthContext } from '@/lib/auth/api-middleware';

export const GET = requirePermissionWithParams('campaigns:read', async (
  request: NextRequest,
  context: AuthContext,
  routeParams: { params: Record<string, string> }
) => {
  try {
    const id = routeParams.params.id;
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

    // Fetch ALL tracking codes for this campaign (INCLUDING hidden for analytics)
    const [trackingCodesForAnalytics] = await pool.execute(
      'SELECT tracking_code FROM utm_codes WHERE campaign_id = ?',
      [id]
    );

    // Fetch ONLY active tracking codes for display
    const [trackingCodesForDisplay] = await pool.execute(
      'SELECT tracking_code FROM utm_codes WHERE campaign_id = ? AND status = "active"',
      [id]
    );

    // Use ALL tracking codes (including hidden) for analytics calculations
    const trackingCodesList = (trackingCodesForAnalytics as any[]).map(tc => tc.tracking_code).filter(code => code && code !== '');

    // Fetch analytics from ClickHouse for ALL tracking codes + legacy data
    // Campaign-level totals should include legacy data from hard-deleted UTMs (true business performance)
    let clicks = 0;
    let visitors = 0;
    let clicksFromLegacyData = 0;
    let visitorsFromLegacyData = 0;

    const activeTrackingCodesSet = new Set(trackingCodesList);
    
    // Get ALL clicks for this campaign (including hard-deleted UTMs via campaign_id)
    // Use last 90 days for performance (materialized view optimization)
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    try {
      // Query ALL clicks for this campaign by campaign_id (includes legacy from hard-deleted UTMs)
      const allClicksQuery = await queryWithMemoryLimit(`
        SELECT COUNT(*) as total_clicks
        FROM analytics.tracking_events_buffer
        WHERE campaign_id = ${id}
          AND toDate(toTimeZone(timestamp, 'Asia/Seoul')) >= toDate('${startDateStr}')
          AND toDate(toTimeZone(timestamp, 'Asia/Seoul')) <= toDate('${endDate}')
          AND tracking_code != ''
          AND tracking_code IS NOT NULL
      `, {
        format: 'JSONEachRow'
      });

      const allClicksData = await allClicksQuery.json() as any[];
      if (allClicksData.length > 0) {
        clicks = parseInt((allClicksData[0] as any).total_clicks || '0');
      }
      
      // Track legacy clicks separately (clicks from deleted tracking codes)
      if (activeTrackingCodesSet.size > 0 && trackingCodesList.length > 0) {
        const trackingCodesListEscaped = trackingCodesList.map(code => `'${code.replace(/'/g, "\\'")}'`).join(',');
        const legacyClicksQuery = `
          SELECT 
            tracking_code,
            COUNT(*) as total_clicks
          FROM analytics.tracking_events_buffer
          WHERE campaign_id = ${id}
            AND toDate(toTimeZone(timestamp, 'Asia/Seoul')) >= toDate('${startDateStr}')
            AND toDate(toTimeZone(timestamp, 'Asia/Seoul')) <= toDate('${endDate}')
            AND tracking_code != ''
            AND tracking_code IS NOT NULL
            AND tracking_code NOT IN (${trackingCodesListEscaped})
          GROUP BY tracking_code
        `;
        
        try {
          const legacyClicksResult = await queryWithMemoryLimit(legacyClicksQuery, {
            format: 'JSONEachRow'
          });
          
          const legacyClicksData = await legacyClicksResult.json() as any[];
          legacyClicksData.forEach((row: any) => {
            clicksFromLegacyData += parseInt(row.total_clicks || '0');
          });
        } catch (error) {
          console.warn('Error calculating legacy clicks:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching campaign clicks:', error);
    }

    // Get unique visitors from visit_logs - include ALL visitors for this campaign (including legacy)
    // Campaign-level totals should include visitors from hard-deleted UTMs
    try {
      // Query ALL visitors by campaign_id (includes deleted UTMs)
      const visitorsQuery = `
        SELECT 
          uniq(user_id) as unique_visitors
        FROM analytics.visit_logs_buffer
        WHERE campaign_id = ${id}
          AND utm_source != '' AND utm_source != 'Direct' AND utm_source != '(direct)'
      `;
      
      const visitorsResult = await queryWithMemoryLimit(visitorsQuery, {
        format: 'JSONEachRow'
      });

      const visitorsData = await visitorsResult.json() as any[];
      if (visitorsData.length > 0) {
        visitors = parseInt((visitorsData[0] as any).unique_visitors || '0');
      }
      
      // Track legacy visitors separately (visitors from deleted tracking codes)
      if (activeTrackingCodesSet.size > 0) {
        const trackingCodesListEscaped = trackingCodesList.map(code => `'${code.replace(/'/g, "\\'")}'`).join(',');
        const legacyVisitorsQuery = `
          SELECT 
            tracking_code,
            uniq(user_id) as unique_visitors
          FROM analytics.visit_logs_buffer
          WHERE campaign_id = ${id}
            AND tracking_code != ''
            AND tracking_code IS NOT NULL
            AND tracking_code NOT IN (${trackingCodesListEscaped})
            AND utm_source != '' AND utm_source != 'Direct' AND utm_source != '(direct)'
          GROUP BY tracking_code
        `;
        
        try {
          const legacyVisitorsResult = await queryWithMemoryLimit(legacyVisitorsQuery, {
            format: 'JSONEachRow'
          });
          
          const legacyVisitorsData = await legacyVisitorsResult.json() as any[];
          let legacyVisitorsSum = 0;
          legacyVisitorsData.forEach((row: any) => {
            legacyVisitorsSum += parseInt(row.unique_visitors || '0');
          });
          visitorsFromLegacyData = legacyVisitorsSum;
        } catch (error) {
          console.warn('Error calculating legacy visitors:', error);
        }
      }
    } catch (error) {
      console.warn('⚠️ ClickHouse query failed, using 0 for visits:', error);
      // Continue with 0 visitors if ClickHouse fails
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
        const clickhouseTrackingCodesQuery = await queryWithMemoryLimit(`
            SELECT DISTINCT tracking_code
            FROM analytics.visit_logs_buffer
            WHERE campaign_id = ${id}
              AND tracking_code != ''
              AND tracking_code IS NOT NULL
        `, {
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

      // Get all distinct tracking codes from ClickHouse tracking_events (by tracking_code only)
      // tracking_events_buffer doesn't have campaign_id column
      const clickhouseTrackingCodesFromClicks = new Set<string>();
      if (trackingCodesList.length > 0) {
        try {
          const trackingCodesListEscaped = trackingCodesList.map(code => `'${code.replace(/'/g, "\\'")}'`).join(',');
          const clickhouseClicksQuery = await queryWithMemoryLimit(`
              SELECT DISTINCT tracking_code
              FROM analytics.tracking_events_buffer
              WHERE tracking_code IN (${trackingCodesListEscaped})
                AND tracking_code != ''
                AND tracking_code IS NOT NULL
          `, {
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

      // Also check if we have clicks or visitors from legacy data (calculated earlier)
      if (clicksFromLegacyData > 0 || visitorsFromLegacyData > 0) {
        hasLegacyData = true;
      }

      // Check if we have visitors/clicks via campaign_id but no matching active tracking codes
      // This happens when UTMs were hard-deleted but campaign_id is stored in ClickHouse
      if (allClickhouseTrackingCodes.size > 0 && activeTrackingCodes.size === 0 && clicks > 0) {
        hasLegacyData = true;
      }

      // Check if we have visitors/clicks but no matching active tracking codes
      // This could indicate legacy data from hard-deleted UTMs
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
      // But if we detected legacy clicks or visitors earlier, still flag it
      if (clicksFromLegacyData > 0 || visitorsFromLegacyData > 0) {
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
        clicksFromLegacyData, // Number of clicks from hard-deleted UTMs (for display)
        visitorsFromLegacyData // Number of visitors from hard-deleted UTMs (for display)
      }
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
});

export const PUT = requirePermissionWithParams('campaigns:update', async (
  request: NextRequest,
  context: AuthContext,
  routeParams: { params: Record<string, string> }
) => {
  try {
    const id = routeParams.params.id;
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
});

export const DELETE = requirePermissionWithParams('campaigns:delete', async (
  request: NextRequest,
  context: AuthContext,
  routeParams: { params: Record<string, string> }
) => {
  try {
    const id = routeParams.params.id;
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
});

