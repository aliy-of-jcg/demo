import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import clickhouse from '@/lib/clickhouse';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    console.log(`🏷️ UTM Codes API - Page: ${page}, Limit: ${limit}, Search: ${search || 'none'}`);

    const offset = (page - 1) * limit;
    const pool = getPool();

    // Build WHERE conditions
    let whereConditions = 'WHERE utm_codes.status != \'hidden\''; // Exclude hidden UTM codes (soft deleted)
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
      try {
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
      } catch (error) {
        // Silently fail - continue without click data
      }
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
          // Invalid URL, keep as-is
        }
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
        status: utm.status || 'active' // Use status from database
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
    return NextResponse.json(
      { success: false, error: 'Failed to fetch UTM codes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pool = getPool();
    const {
      name,
      landing_url,
      utm_source,
      utm_medium,
      utm_term,
      utm_content,
      campaign_id
    } = body;

    // Validate required fields
    if (!name || !landing_url) {
      return NextResponse.json(
        {success: false, error: 'UTM name and landing URL are required'},
        {status: 400}
      );
    }

    // Validate campaign_id - must be provided and be a valid number
    if (!campaign_id || campaign_id === '' || campaign_id === "0") {
      return NextResponse.json(
        {success: false, error: 'Campaign selection is required'},
        {status: 400}
      );
    }

    // Parse campaign_id to integer to ensure it's a valid number
    const parsedCampaignId = parseInt(campaign_id, 10);
    if (isNaN(parsedCampaignId) || parsedCampaignId <= 0) {
      return NextResponse.json(
        {success: false, error: 'Invalid campaign ID'},
        {status: 400}
      );
    }

    // Get a campaign name for utm_campaign
    const [campaignRows] = await pool.execute(
      'SELECT name FROM campaigns WHERE id = ?',
      [parsedCampaignId]
    );

    if (!campaignRows || (campaignRows as any[]).length === 0) {
      return NextResponse.json( 
        {success: false, error: 'Selected campaign not found'},
        {status: 404}
      );
    }

    const utm_campaign = (campaignRows as any[])[0].name;

    // Generate a unique tracking code  (shorter format)
    const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
    const random = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4 characters
    const tracking_code = `${timestamp}${random}`; // e.g., 12345243431 (12 characters)

    // Build full URl with UTM parameters
      let fullUrlWithUtm = landing_url;
      try {
        const urlObj = new URL(landing_url);
        if (utm_campaign) urlObj.searchParams.set('utm_campaign', utm_campaign);
        if (utm_source) urlObj.searchParams.set('utm_source', utm_source);
        if (utm_medium) urlObj.searchParams.set('utm_medium', utm_medium);
        if (utm_term) urlObj.searchParams.set('utm_term', utm_term);
        if (utm_content) urlObj.searchParams.set('utm_content', utm_content);
        fullUrlWithUtm = urlObj.toString();
  } catch (error) {
    // If landing_url is invalid, use it as-is
    console.warn('Invalid landing URL, using as-is:', landing_url);
  }

      // Insert the new UTM code
      const [result] = await pool.execute(
        `INSERT INTO utm_codes (
          name, 
          tracking_code, 
          campaign_id,
          utm_source, 
          utm_medium, 
          utm_campaign, 
          utm_term, 
          utm_content, 
          landing_url,
          full_url,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          name,
          tracking_code,
          parsedCampaignId,  // Use parsed integer
          utm_source || null,
          utm_medium || null,
          utm_campaign,
          utm_term || null,
          utm_content || null,
          landing_url,
          fullUrlWithUtm
        ]
      );

      const insertResult = result as any;

    return NextResponse.json({
      success: true,
      message: 'UTM code created successfully',
      utm_code: {
        id: insertResult.insertId,
        name,
        tracking_code,
        landing_url,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        full_url: fullUrlWithUtm
      }
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create UTM code' },
      { status: 500 }
    );
  }
}
