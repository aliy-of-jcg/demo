import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
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

    // Build WHERE conditions dynamically
    let whereConditions = ' AND campaigns.status != \'hidden\''; // Exclude hidden campaigns by default
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
    let trackingCodesMap = new Map();
    
    if (campaignIds.length > 0) {
      const placeholders = campaignIds.map(() => '?').join(',');
      
      // Fetch platforms (unique source/medium combinations)
      const [allPlatforms] = await pool.execute(
        `SELECT campaign_id, utm_source, utm_medium 
         FROM utm_codes 
         WHERE campaign_id IN (${placeholders}) AND status = 'active'
         GROUP BY campaign_id, utm_source, utm_medium
         ORDER BY campaign_id, utm_source`,
        campaignIds
      );
      
      // Fetch the first tracking code for each campaign (for the tracking link column)
      const [firstTrackingCodes] = await pool.execute(
        `SELECT u1.campaign_id, u1.tracking_code 
         FROM utm_codes u1
         INNER JOIN (
           SELECT campaign_id, MIN(id) as min_id
           FROM utm_codes
           WHERE campaign_id IN (${placeholders}) AND status = 'active'
           GROUP BY campaign_id
         ) u2 ON u1.campaign_id = u2.campaign_id AND u1.id = u2.min_id`,
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
      
      // Map tracking codes by campaign_id
      (firstTrackingCodes as any[]).forEach(tc => {
        trackingCodesMap.set(tc.campaign_id, tc.tracking_code);
      });
    }

    // Add platforms and tracking_code to each campaign
    const campaignsWithPlatforms = (campaigns as any[]).map(campaign => ({
      ...campaign,
      platforms: platformsMap.get(campaign.id) || [],
      tracking_code: trackingCodesMap.get(campaign.id) || null
    }));

    // Calculate summary stats
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_campaigns,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_campaigns,
        COALESCE(SUM(budget), 0) as total_budget,
        COALESCE(AVG(spent / NULLIF(budget, 0)) * 100, 0) as avg_spent_percentage
      FROM campaigns
    `;
    
    const [summaryResult] = await pool.execute(summaryQuery);
    const summary = (summaryResult as any)[0];

    return NextResponse.json({
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
        avg_conversion_rate: 3.8 // Demo value
      }
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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
      description,
      landing_url,
      utm_campaign,
      utm_source,
      utm_medium,
      utm_term,
      utm_content
    } = body;

    // Validation
    if (!name || !course_id || !source || !medium || !status || !start_date || !end_date || !budget) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const pool = getPool();
    const query = `
      INSERT INTO campaigns (name, course_id, source, medium, status, start_date, end_date, budget, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [
      name,
      course_id,
      source,
      medium,
      status,
      start_date,
      end_date,
      budget,
      description || null
    ]);

    const insertId = (result as any).insertId;

    // Auto-generate tracking link if landing_url and UTM params are provided
    let trackingLink = null;
    if (landing_url && utm_campaign && utm_source && utm_medium) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const trackingResponse = await fetch(`${appUrl}/api/tracking/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            campaignName: name,
            campaignId: insertId,
            targetUrl: landing_url,
            utmSource: utm_source,
            utmMedium: utm_medium,
            utmCampaign: utm_campaign,
            utmContent: utm_content || '',
            utmTerm: utm_term || ''
          })
        });

        const trackingData = await trackingResponse.json();
        if (trackingData.success) {
          trackingLink = trackingData.trackingLink;
          console.log('✅ Tracking link generated:', trackingLink.trackingCode);
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

