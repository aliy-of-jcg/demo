import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import clickhouse from '@/lib/clickhouse';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const offset = (page - 1) * limit;
    const pool = getPool();

    // Build WHERE conditions
    let whereConditions = 'WHERE 1=1';
    const queryParams: any[] = [];

    if (search) {
      whereConditions += ' AND (utm_codes.name LIKE ? OR utm_codes.utm_campaign LIKE ? OR utm_codes.utm_source LIKE ? OR campaigns.name LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM utm_codes 
       LEFT JOIN campaigns ON utm_codes.campaign_id = campaigns.id
       ${whereConditions}`,
      queryParams
    );
    const totalUTMs = (countResult as any)[0].total;

    // Get UTM codes with campaign info (paginated)
    // Build the full query with LIMIT and OFFSET directly (since they're safe integers)
    const [utmCodesResult] = await pool.query(
      `SELECT 
        utm_codes.*,
        campaigns.name as campaign_name,
        courses.name as course_name
       FROM utm_codes
       LEFT JOIN campaigns ON utm_codes.campaign_id = campaigns.id
       LEFT JOIN courses ON campaigns.course_id = courses.id
       ${whereConditions}
       ORDER BY utm_codes.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      queryParams
    );

    const utmCodes = utmCodesResult as any[];

    // Get tracking codes for ClickHouse query
    const trackingCodes = utmCodes.map(utm => utm.tracking_code);

    // Fetch click data from ClickHouse
    let clickDataMap: { [key: string]: number } = {};
    
    if (trackingCodes.length > 0) {
      const escapedCodes = trackingCodes.map(code => `'${code.replace(/'/g, "\\'")}'`).join(',');
      
      const clickQuery = `
        SELECT 
          tracking_code,
          COUNT(*) as total_clicks
        FROM analytics.tracking_events
        WHERE tracking_code IN (${escapedCodes})
        GROUP BY tracking_code
      `;

      const clickData = await clickhouse.query({
        query: clickQuery,
        format: 'JSONEachRow'
      });

      const clickRows = await clickData.json() as any[];
      
      clickRows.forEach((row: any) => {
        clickDataMap[row.tracking_code] = parseInt(row.total_clicks) || 0;
      });
    }

    // Enhance UTM codes with click data and construct full URLs
    const enhancedUTMs = utmCodes.map(utm => {
      const clicks = clickDataMap[utm.tracking_code] || 0;
      
      // Construct full URL with UTM parameters
      let fullUrl = utm.landing_url || '';
      if (fullUrl) {
        try {
          const url = new URL(fullUrl);
          if (utm.utm_campaign) url.searchParams.set('utm_campaign', utm.utm_campaign);
          if (utm.utm_source) url.searchParams.set('utm_source', utm.utm_source);
          if (utm.utm_medium) url.searchParams.set('utm_medium', utm.utm_medium);
          if (utm.utm_term) url.searchParams.set('utm_term', utm.utm_term);
          if (utm.utm_content) url.searchParams.set('utm_content', utm.utm_content);
          fullUrl = url.toString();
        } catch (error) {
          console.error('Invalid URL:', fullUrl);
        }
      }

      // Determine status based on clicks
      let status = 'inactive';
      if (clicks > 0) {
        status = 'active';
      }

      return {
        id: utm.id,
        name: utm.name,
        tracking_code: utm.tracking_code,
        campaign_name: utm.campaign_name || 'No Campaign',
        course_name: utm.course_name || 'No Course',
        utm_source: utm.utm_source,
        utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign,
        utm_term: utm.utm_term,
        utm_content: utm.utm_content,
        landing_url: utm.landing_url,
        full_url: fullUrl,
        created_at: utm.created_at,
        clicks: clicks,
        status: status
      };
    });

    // Calculate summary statistics
    const activeUTMs = enhancedUTMs.filter(utm => utm.status === 'active').length;
    const inactiveUTMs = enhancedUTMs.filter(utm => utm.status === 'inactive').length;
    const totalClicks = enhancedUTMs.reduce((sum, utm) => sum + utm.clicks, 0);

    return NextResponse.json({
      success: true,
      summary: {
        total_utms: totalUTMs,
        active_utms: activeUTMs,
        inactive_utms: inactiveUTMs,
        total_clicks: totalClicks
      },
      utm_list: enhancedUTMs,
      pagination: {
        page: page,
        limit: limit,
        total: totalUTMs,
        totalPages: Math.ceil(totalUTMs / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching UTM codes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch UTM codes' },
      { status: 500 }
    );
  }
}

