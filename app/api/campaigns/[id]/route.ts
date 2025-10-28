import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import clickhouse from '@/lib/clickhouse';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
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

    // Fetch ALL tracking codes for this campaign (not just one)
    const [trackingCodes] = await pool.execute(
      'SELECT tracking_code FROM utm_codes WHERE campaign_id = ? AND status = "active"',
      [id]
    );

    const trackingCodesList = (trackingCodes as any[]).map(tc => tc.tracking_code);

    // Fetch analytics from ClickHouse for ALL tracking codes
    let clicks = 0;
    let visitors = 0;

    if (trackingCodesList.length > 0) {
      // Build IN clause for multiple tracking codes
      const placeholders = trackingCodesList.map((_, i) => `{code${i}:String}`).join(',');
      const queryParams: any = {};
      trackingCodesList.forEach((code, i) => {
        queryParams[`code${i}`] = code;
      });

      const analyticsQuery = await clickhouse.query({
        query: `
          SELECT 
            SUM(total_clicks) as total_clicks,
            SUM(unique_visitors) as unique_visitors
          FROM (
            SELECT 
              tracking_code,
              COUNT(*) as total_clicks,
              COUNT(DISTINCT ip_address) as unique_visitors
            FROM analytics.tracking_events
            WHERE tracking_code IN (${placeholders})
            GROUP BY tracking_code
          )
        `,
        query_params: queryParams,
        format: 'JSONEachRow'
      });

      const analyticsData = await analyticsQuery.json();
      if (analyticsData.length > 0) {
        clicks = parseInt((analyticsData[0] as any).total_clicks || '0');
        visitors = parseInt((analyticsData[0] as any).unique_visitors || '0');
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
      description
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Campaign name is required' },
        { status: 400 }
      );
    }

    const pool = getPool();
    const query = `
      UPDATE campaigns 
      SET name = ?, course_id = ?, source = ?, medium = ?, status = ?, 
          start_date = ?, end_date = ?, budget = ?, description = ?
      WHERE id = ?
    `;

    await pool.execute(query, [
      name,
      course_id || null,
      source || null,
      medium || null,
      status || 'active',
      start_date || null,
      end_date || null,
      budget || null,
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

