import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    
    const pool = getPool();
    
    let query = `
      SELECT 
        utm_codes.id,
        utm_codes.name,
        utm_codes.campaign_id,
        utm_codes.tracking_code,
        utm_codes.utm_campaign,
        utm_codes.utm_source,
        utm_codes.utm_medium,
        utm_codes.utm_term,
        utm_codes.utm_content,
        utm_codes.landing_url,
        utm_codes.full_url,
        utm_codes.clicks,
        utm_codes.status,
        utm_codes.created_at,
        campaigns.name as campaign_name
      FROM utm_codes
      LEFT JOIN campaigns ON utm_codes.campaign_id = campaigns.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (search) {
      query += ` AND (utm_codes.name LIKE ? OR campaigns.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ` ORDER BY utm_codes.created_at DESC`;

    const [links] = await pool.execute(query, params);

    return NextResponse.json({
      success: true,
      links
    });
  } catch (error) {
    console.error('Error fetching tracking links:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tracking links' },
      { status: 500 }
    );
  }
}
