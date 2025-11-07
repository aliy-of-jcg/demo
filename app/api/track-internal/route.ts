import { NextRequest, NextResponse } from 'next/server';
import clickhouse from '@/lib/clickhouse';
import { nanoid } from 'nanoid';

/**
 * Internal Tracking API - For Local Testing Only
 * 
 * This endpoint is used for testing tracking functionality on the CosMos AI
 * dashboard itself (localhost:3000). It should NOT be used in production.
 * 
 * For production tracking on external landing pages, use /api/track instead.
 */

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const {
      event_type,
      page_url,
      page_title,
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      session_id,
      user_id,
      visit_count,
      is_new_visitor,
      device_type,
      os,
      browser,
      screen_resolution,
      user_agent,
      time_on_page
    } = data;

    // Validate required fields
    if (!session_id || !user_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    // SECURITY: Only allow from localhost or internal domains
    const origin = request.headers.get('origin') || '';
    const referer = request.headers.get('referer') || '';
    const host = request.headers.get('host') || '';
    
    const isLocalhost = origin.includes('localhost') || 
                       referer.includes('localhost') ||
                       host.includes('localhost');
    
    const isInternalDomain = origin.includes('cosmos') || 
                            origin.includes('vercel.app') ||
                            referer.includes('cosmos') ||
                            referer.includes('vercel.app');
    
    if (!isLocalhost && !isInternalDomain) {
      console.warn('[CosMos Internal] Blocked tracking from unauthorized origin:', origin || referer);
      return NextResponse.json(
        { success: false, error: 'This endpoint is for internal testing only' },
        { status: 403, headers: corsHeaders }
      );
    }

    console.log('[CosMos Internal] Tracking internal test event:', {
      event_type,
      page_url,
      utm_campaign,
      device_type,
      browser,
      os
    });

    // Insert into ClickHouse visit_logs table
    try {
      await clickhouse.insert({
        table: 'visit_logs',
        values: [{
          timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
          session_id: session_id || '',
          user_id: user_id || '',
          page_url: page_url || '',
          page_title: page_title || '',
          referrer: referrer || '',
          utm_source: utm_source || '',
          utm_medium: utm_medium || '',
          utm_campaign: utm_campaign || '',
          utm_term: utm_term || '',
          utm_content: utm_content || '',
          campaign_id: 0, // Will be populated based on UTM mapping later
          course_id: 0, // Will be populated based on UTM mapping later
          user_agent: user_agent || '',
          device_type: device_type || 'Desktop',
          os: os || 'Unknown',
          browser: browser || 'Unknown',
          screen_resolution: screen_resolution || '',
          visit_count: visit_count || 1,
          is_new_visitor: is_new_visitor || 0,
          time_on_page: time_on_page || 0,
          event_type: event_type || 'pageview',
          page_sequence: data.page_sequence || 0,
          is_landing_page: data.is_landing_page || 0,
          is_exit_page: data.is_exit_page || 0,
          previous_page_url: data.previous_page_url || '',
          conversion_type: data.conversion_type || '',
          conversion_value: data.conversion_value || 0,
          conversion_metadata: data.conversion_metadata || '',
        }],
        format: 'JSONEachRow'
      });

      return NextResponse.json({ 
        success: true,
        message: 'Internal test tracking recorded'
      }, { headers: corsHeaders });
    } catch (error) {
      console.error('Failed to insert internal tracking data:', error);
      // Still return success to avoid blocking the user
      return NextResponse.json({ 
        success: true,
        warning: 'Data may not have been recorded'
      }, { headers: corsHeaders });
    }
  } catch (error) {
    console.error('Internal tracking endpoint error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, {
    status: 200,
    headers: corsHeaders,
  });
}

