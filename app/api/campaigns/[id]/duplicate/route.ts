import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const pool = getPool();
    
    // Fetch original campaign
    const [campaigns] = await pool.execute(
      'SELECT * FROM campaigns WHERE id = ?',
      [id]
    );

    if ((campaigns as any[]).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const original = (campaigns as any)[0];

    // Create duplicate with modified name
    const query = `
      INSERT INTO campaigns (name, course_id, source, medium, status, start_date, end_date, budget, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Validate and sanitize status value
    const validStatuses = ['active', 'waiting', 'ended', 'paused'];
    const originalStatus = original.status && validStatuses.includes(original.status) 
      ? original.status 
      : 'active';
    
    const [result] = await pool.execute(query, [
      `${original.name}_copy`,
      original.course_id,
      original.source,
      original.medium,
      originalStatus, // Use original status (validated)
      original.start_date,
      original.end_date,
      original.budget,
      original.description
    ]);

    const insertId = (result as any).insertId;

    // Fetch the created campaign
    const [newCampaigns] = await pool.execute(
      'SELECT campaigns.*, courses.name as course_name FROM campaigns LEFT JOIN courses ON campaigns.course_id = courses.id WHERE campaigns.id = ?',
      [insertId]
    );

    return NextResponse.json({
      success: true,
      campaign: (newCampaigns as any)[0]
    });
  } catch (error) {
    console.error('Error duplicating campaign:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to duplicate campaign' },
      { status: 500 }
    );
  }
}

