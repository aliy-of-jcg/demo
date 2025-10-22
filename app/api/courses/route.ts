import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    
    const pool = getPool();
    let query = 'SELECT * FROM courses WHERE 1=1';
    const params: any[] = [];

    // Filter by status if provided, otherwise show only active by default
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    } else {
      // If no status filter, show all courses
      // Remove the default "active" only filter to show all
    }

    if (search) {
      query += ' AND (name LIKE ? OR code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY name ASC';

    const [courses] = await pool.execute(query, params);

    // Get summary stats
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_courses,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_courses
      FROM courses
    `;
    
    const [summaryResult] = await pool.execute(summaryQuery);
    const summary = (summaryResult as any)[0];

    return NextResponse.json({
      success: true,
      courses,
      summary: {
        total_courses: summary.total_courses,
        active_courses: summary.active_courses,
        total_campaigns: 0, // Will be calculated from campaigns
        total_visits: 0 // Will be calculated from ClickHouse
      }
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      code,
      category,
      duration,
      price,
      status
    } = body;

    // Validation
    if (!name || !code) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const pool = getPool();
    const query = `
      INSERT INTO courses (name, code, category, duration, price, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [
      name,
      code,
      category || null,
      duration || null,
      price || null,
      status || 'active'
    ]);

    const insertId = (result as any).insertId;

    // Fetch the created course
    const [courses] = await pool.execute('SELECT * FROM courses WHERE id = ?', [insertId]);

    return NextResponse.json({
      success: true,
      course: (courses as any)[0]
    });
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create course' },
      { status: 500 }
    );
  }
}

