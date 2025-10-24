import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const pool = getPool();
    
    const [courses] = await pool.execute(
      'SELECT * FROM courses WHERE id = ?',
      [id]
    );

    if ((courses as any[]).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      course: (courses as any)[0]
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch course' },
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
    const {
      name,
      code,
      category,
      duration,
      price,
      status
    } = body;

    // Validate required fields
    if (!name || !code) {
      return NextResponse.json(
        { success: false, error: 'Course name and code are required' },
        { status: 400 }
      );
    }

    const pool = getPool();
    const query = `
      UPDATE courses 
      SET name = ?, code = ?, category = ?, duration = ?, price = ?, status = ?
      WHERE id = ?
    `;

    await pool.execute(query, [
      name,
      code,
      category || null,
      duration || null,
      price || null,
      status || 'active',
      id
    ]);

    // Fetch updated course
    const [courses] = await pool.execute(
      'SELECT * FROM courses WHERE id = ?',
      [id]
    );

    return NextResponse.json({
      success: true,
      course: (courses as any)[0]
    });
  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update course' },
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
    
    // Check if course has active campaigns
    const [campaigns] = await pool.execute(
      'SELECT COUNT(*) as count FROM campaigns WHERE course_id = ? AND status != ?',
      [id, 'hidden']
    );
    
    const campaignCount = (campaigns as any)[0].count;
    
    if (campaignCount > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete course with ${campaignCount} active campaign${campaignCount > 1 ? 's' : ''}. Please delete or reassign the campaign${campaignCount > 1 ? 's' : ''} first.` 
        },
        { status: 400 }
      );
    }
    
    // Soft delete - set status to 'hidden' instead of deleting
    await pool.execute(
      'UPDATE courses SET status = ? WHERE id = ?',
      ['hidden', id]
    );

    return NextResponse.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete course' },
      { status: 500 }
    );
  }
}
