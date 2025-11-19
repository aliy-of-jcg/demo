import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const id = params.id;
    const pool = getPool();
    
    // Get the UTM code
    const [utmCodeResult] = await pool.execute(
      'SELECT * FROM utm_codes WHERE id = ?',
      [id]
    );

    const utmCodes = utmCodeResult as any[];
    
    if (utmCodes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'UTM code not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      utm_code: utmCodes[0]
    });
  } catch (error) {
    console.error('Error fetching UTM code:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch UTM code' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const id = params.id;
    const pool = getPool();
    
    // Soft delete - set status to 'hidden' instead of deleting
    await pool.execute(
      'UPDATE utm_codes SET status = ? WHERE id = ?',
      ['hidden', id]
    );

    return NextResponse.json({
      success: true,
      message: 'UTM code deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting UTM code:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete UTM code' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const id = params.id;
    const body = await request.json();
    const pool = getPool();

    // If only status is being updated (quick toggle)
    if (body.status && Object.keys(body).length === 1) {
      await pool.execute(
        'UPDATE utm_codes SET status = ? WHERE id = ?',
        [body.status, id]
      );

      return NextResponse.json({
        success: true,
        message: 'UTM status updated successfully'
      });
    }

    const {
      name,
      utm_source,
      utm_medium,
      utm_term,
      utm_content,
      landing_url,
      campaign_id,
      status
    } = body;

    // Validate required fields for full update
    if (!name || !landing_url) {
      return NextResponse.json(
        { success: false, error: 'UTM name and landing URL are required' },
        { status: 400 }
      );
    }

    // Validate campaign_id - must be provided and be a valid number
    if (!campaign_id || campaign_id === '' || campaign_id === '0') {
      return NextResponse.json(
        { success: false, error: 'Campaign selection is required' },
        { status: 400 }
      );
    }

    // Parse campaign_id to integer to ensure it's a valid number
    const parsedCampaignId = parseInt(campaign_id, 10);
    if (isNaN(parsedCampaignId) || parsedCampaignId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid campaign ID' },
        { status: 400 }
      );
    }

    // Get campaign name for utm_campaign
    const [campaignRows] = await pool.execute(
      'SELECT name FROM campaigns WHERE id = ?',
      [parsedCampaignId]
    );

    if (!campaignRows || (campaignRows as any[]).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Selected campaign not found' },
        { status: 404 }
      );
    }

    const utm_campaign = (campaignRows as any[])[0].name;

    // Build full URL with UTM parameters
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

    // Update the UTM code
    await pool.execute(
      `UPDATE utm_codes SET 
        name = ?,
        campaign_id = ?,
        utm_source = ?,
        utm_medium = ?,
        utm_campaign = ?,
        utm_term = ?,
        utm_content = ?,
        landing_url = ?,
        full_url = ?,
        status = ?
      WHERE id = ?`,
      [
        name,
        parsedCampaignId,  // Use parsed integer
        utm_source || null,
        utm_medium || null,
        utm_campaign,
        utm_term || null,
        utm_content || null,
        landing_url,
        fullUrlWithUtm,
        status || 'active',
        id
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'UTM code updated successfully'
    });
  } catch (error) {
    console.error('Error updating UTM code:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update UTM code' },
      { status: 500 }
    );
  }
}
