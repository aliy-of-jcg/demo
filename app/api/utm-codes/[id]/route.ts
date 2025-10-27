import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const pool = getPool();
    
    // Delete the UTM code
    await pool.execute(
      'DELETE FROM utm_codes WHERE id = ?',
      [id]
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
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    const pool = getPool();

    const {
      name,
      utm_source,
      utm_medium,
      utm_term,
      utm_content,
      landing_url,
      campaign_id
    } = body;

    // Validate required fields
    if (!name || !landing_url) {
      return NextResponse.json(
        { success: false, error: 'UTM name and landing URL are required' },
        { status: 400 }
      );
    }

    if (!campaign_id) {
      return NextResponse.json(
        { success: false, error: 'Campaign selection is required' },
        { status: 400 }
      );
    }

    // Get campaign name for utm_campaign
    const [campaignRows] = await pool.execute(
      'SELECT name FROM campaigns WHERE id = ?',
      [campaign_id]
    );

    if (!campaignRows || (campaignRows as any[]).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Selected campaign not found' },
        { status: 404 }
      );
    }

    const utm_campaign = (campaignRows as any[])[0].name;

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
        landing_url = ?
      WHERE id = ?`,
      [
        name,
        campaign_id,
        utm_source || null,
        utm_medium || null,
        utm_campaign,
        utm_term || null,
        utm_content || null,
        landing_url,
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

