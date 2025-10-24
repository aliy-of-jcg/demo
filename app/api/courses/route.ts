import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import clickhouse from '@/lib/clickhouse';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    
    const pool = getPool();
    let query = 'SELECT * FROM courses WHERE status != \'hidden\''; // Exclude hidden courses by default
    const params: any[] = [];

    // Filter by status if provided
    if (status) {
      query = 'SELECT * FROM courses WHERE status = ?';
      params.push(status);
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

    // Get total active campaigns per course from MySQL
    const campaignsQuery = `
      SELECT 
        course_id,
        COUNT(*) as active_campaigns
      FROM campaigns
      WHERE status = 'active'
      GROUP BY course_id
    `;
    
    const [campaignsResult] = await pool.execute(campaignsQuery);
    const campaignsMap = new Map();
    (campaignsResult as any[]).forEach((row: any) => {
      campaignsMap.set(row.course_id, row.active_campaigns);
    });

    // Get total visits per course from ClickHouse
    let visitsMap = new Map();
    try {
      const visitsQuery = `
        SELECT 
          course_id,
          COUNT(DISTINCT user_id) as total_visits
        FROM analytics.visit_logs
        WHERE course_id > 0
        GROUP BY course_id
      `;
      
      const visitsResult = await clickhouse.query({
        query: visitsQuery,
        format: 'JSONEachRow'
      });
      
      const visitsData = await visitsResult.json();
      visitsData.forEach((row: any) => {
        visitsMap.set(row.course_id, row.total_visits);
      });
    } catch (chError) {
      console.warn('⚠️ ClickHouse query failed, using 0 for visits:', chError);
      // Continue with 0 visits if ClickHouse fails
    }

    // Get total visits for summary
    const totalVisitsQuery = `
      SELECT COUNT(DISTINCT user_id) as total
      FROM analytics.visit_logs
    `;
    
    let totalVisits = 0;
    try {
      const totalVisitsResult = await clickhouse.query({
        query: totalVisitsQuery,
        format: 'JSONEachRow'
      });
      const totalVisitsData = await totalVisitsResult.json();
      totalVisits = totalVisitsData[0]?.total || 0;
    } catch (chError) {
      console.warn('⚠️ ClickHouse total visits query failed:', chError);
    }

    // Enhance courses with real analytics
    const enhancedCourses = (courses as any[]).map(course => ({
      ...course,
      active_campaigns: campaignsMap.get(course.id) || 0,
      total_visits: visitsMap.get(course.id) || 0
    }));

    return NextResponse.json({
      success: true,
      courses: enhancedCourses,
      summary: {
        total_courses: summary.total_courses,
        active_courses: summary.active_courses,
        total_campaigns: campaignsMap.size,
        total_visits: totalVisits
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

