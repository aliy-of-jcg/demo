import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      campaign_name,
      target_url,
      description,
      utm_campaign,
      utm_source,
      utm_medium,
      utm_term,
      utm_content
    } = body;

    if (!campaign_name || !target_url) {
      return NextResponse.json(
        { success: false, error: 'Campaign name and target URL are required' },
        { status: 400 }
      );
    }

    // Generate unique tracking code
    const trackingCode = nanoid(10);
    const id = nanoid();

    // Build full URL with UTM parameters
    const url = new URL(target_url);
    if (utm_campaign) url.searchParams.set('utm_campaign', utm_campaign);
    if (utm_source) url.searchParams.set('utm_source', utm_source);
    if (utm_medium) url.searchParams.set('utm_medium', utm_medium);
    if (utm_term) url.searchParams.set('utm_term', utm_term);
    if (utm_content) url.searchParams.set('utm_content', utm_content);
    const fullUrl = url.toString();

    const pool = getPool();

    // Insert into MySQL utm_codes table
    await pool.execute(
      `INSERT INTO utm_codes 
       (name, campaign_id, tracking_code, utm_campaign, utm_source, utm_medium, utm_term, utm_content, landing_url, full_url, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        campaign_name,
        null, // No campaign_id for manually created links
        trackingCode,
        utm_campaign || '',
        utm_source || '',
        utm_medium || '',
        utm_term || '',
        utm_content || '',
        target_url,
        fullUrl
      ]
    );

    return NextResponse.json({
      success: true,
      tracking_code: trackingCode,
      short_url: `/t/${trackingCode}`,
      full_url: fullUrl
    });
  } catch (error) {
    console.error('Error creating tracking link:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create tracking link' },
      { status: 500 }
    );
  }
}

