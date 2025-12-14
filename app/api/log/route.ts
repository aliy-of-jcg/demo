import { NextRequest, NextResponse } from 'next/server';
import clickhouse, { insertWithMemoryLimit } from '@/lib/clickhouse';
import { getPool } from '@/lib/mysql';

export const dynamic = 'force-dynamic';

// CORS configuration for external tracking
const ALLOWED_ORIGINS = [
  'http://aptdecor.uz',
  'https://aptdecor.uz',
  'http://jcg.asia',
  'https://jcg.asia',
  'https://www.aptdecor.uz',
  'https://www.jcg.asia',
  'http://localhost:3000', // For local testing
];

// Dynamic CORS headers based on request origin
function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Handle OPTIONS preflight request
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return NextResponse.json({}, { headers: getCorsHeaders(origin) });
}

// Handle POST request - receive tracking events
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  try {
    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.session_id || !body.user_id || !body.page_url) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Extract IP address from headers
    const ip = request.headers.get('x-forwarded-for') || 
                request.headers.get('x-real-ip') || 
                'unknown';

    // ✨ NEW: Link UTM parameters to campaign and course
    let campaign_id = 0;
    let course_id = 0;

    // If we have UTM parameters, try to match them to a campaign
    if (body.utm_campaign || body.utm_source || body.utm_medium) {
      try {
        const pool = getPool();
        
        // Build dynamic query based on available UTM parameters
        let query = `
          SELECT 
            c.id as campaign_id, 
            c.course_id,
            c.name as campaign_name
          FROM utm_codes u
          INNER JOIN campaigns c ON u.campaign_id = c.id
          WHERE u.status != 'hidden'
        `;
        const params: any[] = [];

        // Match by utm_campaign (most specific)
        if (body.utm_campaign) {
          query += ' AND u.utm_campaign = ?';
          params.push(body.utm_campaign);
        }

        // Match by utm_source
        if (body.utm_source) {
          query += ' AND u.utm_source = ?';
          params.push(body.utm_source);
        }

        // Match by utm_medium
        if (body.utm_medium) {
          query += ' AND u.utm_medium = ?';
          params.push(body.utm_medium);
        }

        query += ' LIMIT 1';

        const [rows] = await pool.execute(query, params);
        
        if ((rows as any[]).length > 0) {
          const match = (rows as any[])[0];
          campaign_id = match.campaign_id;
          course_id = match.course_id || 0;
          
          console.log(`✅ Linked pageview to campaign: ${match.campaign_name} (campaign_id: ${campaign_id}, course_id: ${course_id})`);
        } else {
          console.log('ℹ️  No campaign match found for UTM parameters:', {
            utm_campaign: body.utm_campaign,
            utm_source: body.utm_source,
            utm_medium: body.utm_medium
          });
        }
      } catch (mysqlError) {
        console.warn('⚠️  Failed to link UTM to campaign:', mysqlError);
        // Continue with campaign_id = 0 if linking fails
      }
    }

    // Prepare data for ClickHouse
    const eventData = {
      timestamp: body.timestamp || Math.floor(Date.now() / 1000),
      session_id: body.session_id,
      user_id: body.user_id,
      page_url: body.page_url || '',
      page_title: body.page_title || '',
      referrer: body.referrer || '',
      utm_source: body.utm_source || '',
      utm_medium: body.utm_medium || '',
      utm_campaign: body.utm_campaign || '',
      utm_term: body.utm_term || '',
      utm_content: body.utm_content || '',
      campaign_id: campaign_id, // ✨ Now populated from MySQL lookup
      course_id: course_id,       // ✨ Now populated from MySQL lookup
      user_agent: body.user_agent || '',
      device_type: body.device_type || 'unknown',
      os: body.os || '',
      browser: body.browser || '',
      screen_resolution: body.screen_resolution || '',
      visit_count: body.visit_count || 1,
      is_new_visitor: body.is_new_visitor || 0,
      time_on_page: body.time_on_page || 0,
      event_type: body.event_type || 'pageview',
      
      // Page Flow Tracking (Phase 1 Enhancement)
      page_sequence: body.page_sequence || 0,
      is_landing_page: body.is_landing_page || 0,
      is_exit_page: body.event_type === 'page_exit' ? 1 : 0,
      previous_page_url: body.previous_page_url || ''
    };

    // Insert into ClickHouse
    await insertWithMemoryLimit({
      table: 'analytics.visit_logs',
      values: [eventData],
      format: 'JSONEachRow'
    });

    // Return success response
    return NextResponse.json(
      { success: true, message: 'Event logged' },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('[Tracking Log] ❌ Error logging event:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to log event',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

