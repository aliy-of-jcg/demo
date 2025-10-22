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
    const [courses] = await pool.execute('SELECT * FROM courses WHERE id = ?', [id]);

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
    
    // Check if course has campaigns
    const [campaigns] = await pool.execute(
      'SELECT COUNT(*) as count FROM campaigns WHERE course_id = ?',
      [id]
    );

    if ((campaigns as any)[0].count > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete course with existing campaigns' },
        { status: 400 }
      );
    }

    await pool.execute('DELETE FROM courses WHERE id = ?', [id]);

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

