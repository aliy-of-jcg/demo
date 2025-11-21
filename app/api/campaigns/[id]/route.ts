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

    // Fetch ALL tracking codes and UTM campaign names for this campaign
    const [trackingCodes] = await pool.execute(
      'SELECT tracking_code, utm_campaign FROM utm_codes WHERE campaign_id = ? AND status = "active"',
      [id]
    );

    const trackingCodesList = (trackingCodes as any[]).map(tc => tc.tracking_code).filter(code => code && code !== '');
    const utmCampaigns = Array.from(new Set((trackingCodes as any[]).map(tc => tc.utm_campaign).filter(Boolean)));

    // Fetch analytics from ClickHouse for ALL tracking codes + legacy data
    let clicks = 0;
    let visitors = 0;

    // Get clicks from tracking_events (only valid tracking codes)
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

    // Get unique visitors from visit_logs (include both tracking codes AND legacy data)
    // Match channel-performance and campaigns list approach
    // Use string interpolation for consistency with campaign-analysis API
    let visitorsQuery: string;
    
    if (trackingCodesList.length === 0 && utmCampaigns.length > 0) {
      // Fallback: only legacy data available
      const utmCampaignsList = utmCampaigns.map(c => `'${c.replace(/'/g, "\\'")}'`).join(',');
      visitorsQuery = `
        SELECT 
          COUNT(DISTINCT user_id) as unique_visitors
        FROM analytics.visit_logs
        WHERE utm_campaign IN (${utmCampaignsList})
          AND (tracking_code = '' OR tracking_code IS NULL)
          AND utm_source != '' AND utm_source != 'Direct' AND utm_source != '(direct)'
      `;
    } else if (trackingCodesList.length > 0 && utmCampaigns.length > 0) {
      // Both tracking codes and legacy data
      const trackingCodesListEscaped = trackingCodesList.map(code => `'${code.replace(/'/g, "\\'")}'`).join(',');
      const utmCampaignsList = utmCampaigns.map(c => `'${c.replace(/'/g, "\\'")}'`).join(',');
      
      visitorsQuery = `
        SELECT 
          COUNT(DISTINCT user_id) as unique_visitors
        FROM analytics.visit_logs
        WHERE (tracking_code IN (${trackingCodesListEscaped}) OR (tracking_code = '' AND utm_campaign IN (${utmCampaignsList})))
          AND utm_source != '' AND utm_source != 'Direct' AND utm_source != '(direct)'
      `;
    } else if (trackingCodesList.length > 0) {
      // Only tracking codes
      const trackingCodesListEscaped = trackingCodesList.map(code => `'${code.replace(/'/g, "\\'")}'`).join(',');
      
      visitorsQuery = `
        SELECT 
          COUNT(DISTINCT user_id) as unique_visitors
        FROM analytics.visit_logs
        WHERE tracking_code IN (${trackingCodesListEscaped})
      `;
    } else {
      // No data available
      visitorsQuery = null as any;
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

    return NextResponse.json({
      success: true,
      campaign: {
        ...campaign,
        clicks,
        visitors,
        ctr,
        conversion_rate: conversionRate,
        spent: calculatedSpent // Override spent with calculated value
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

