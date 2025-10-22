import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const source = searchParams.get('source') || '';
    const medium = searchParams.get('medium') || '';
    const status = searchParams.get('status') || '';
    const courseId = searchParams.get('course_id') || '';
    const startDate = searchParams.get('start_date') || '';
    const endDate = searchParams.get('end_date') || '';
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortOrder = searchParams.get('sort_order') || 'DESC';

    const offset = (page - 1) * limit;
    
    // Whitelist valid sort columns to prevent SQL injection
    const validSortColumns = ['id', 'name', 'source', 'medium', 'status', 'start_date', 'end_date', 'budget', 'spent', 'created_at', 'updated_at'];
    const validSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    const pool = getPool();

    // Build WHERE conditions dynamically
    let whereConditions = '';
    const countParams: any[] = [];
    const queryParams: any[] = [];

    if (search) {
      whereConditions += ' AND (campaigns.name LIKE ? OR courses.name LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (source) {
      whereConditions += ' AND campaigns.source = ?';
      countParams.push(source);
      queryParams.push(source);
    }

    if (medium) {
      whereConditions += ' AND campaigns.medium = ?';
      countParams.push(medium);
      queryParams.push(medium);
    }

    if (status) {
      whereConditions += ' AND campaigns.status = ?';
      countParams.push(status);
      queryParams.push(status);
    }

    if (courseId) {
      whereConditions += ' AND campaigns.course_id = ?';
      countParams.push(parseInt(courseId));
      queryParams.push(parseInt(courseId));
    }

    if (startDate) {
      whereConditions += ' AND campaigns.start_date >= ?';
      countParams.push(startDate);
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions += ' AND campaigns.end_date <= ?';
      countParams.push(endDate);
      queryParams.push(endDate);
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM campaigns
      LEFT JOIN courses ON campaigns.course_id = courses.id
      WHERE 1=1${whereConditions}
    `;
    
    const [countResult] = await pool.execute(countQuery, countParams);
    const total = (countResult as any)[0].total;

    // Get campaigns with course info
    // Build the complete query without string interpolation in ORDER BY
    const baseQuery = `
      SELECT 
        campaigns.*,
        courses.name as course_name,
        courses.code as course_code
      FROM campaigns
      LEFT JOIN courses ON campaigns.course_id = courses.id
      WHERE 1=1${whereConditions}
    `;
    
    // Manually construct ORDER BY and LIMIT (safe because validSortBy and validSortOrder are whitelisted)
    const fullQuery = baseQuery + ` ORDER BY campaigns.${validSortBy} ${validSortOrder} LIMIT ${limit} OFFSET ${offset}`;

    const [campaigns] = await pool.execute(fullQuery, queryParams);

    // Calculate summary stats
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_campaigns,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_campaigns,
        COALESCE(SUM(budget), 0) as total_budget,
        COALESCE(AVG(spent / NULLIF(budget, 0)) * 100, 0) as avg_spent_percentage
      FROM campaigns
    `;
    
    const [summaryResult] = await pool.execute(summaryQuery);
    const summary = (summaryResult as any)[0];

    return NextResponse.json({
      success: true,
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      summary: {
        total_campaigns: summary.total_campaigns,
        active_campaigns: summary.active_campaigns,
        total_budget: parseFloat(summary.total_budget),
        avg_conversion_rate: 3.8 // Demo value
      }
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      course_id,
      source,
      medium,
      status,
      start_date,
      end_date,
      budget,
      description
    } = body;

    // Validation
    if (!name || !course_id || !source || !medium || !status || !start_date || !end_date || !budget) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const pool = getPool();
    const query = `
      INSERT INTO campaigns (name, course_id, source, medium, status, start_date, end_date, budget, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [
      name,
      course_id,
      source,
      medium,
      status,
      start_date,
      end_date,
      budget,
      description || null
    ]);

    const insertId = (result as any).insertId;

    // Fetch the created campaign
    const [campaigns] = await pool.execute(
      'SELECT campaigns.*, courses.name as course_name FROM campaigns LEFT JOIN courses ON campaigns.course_id = courses.id WHERE campaigns.id = ?',
      [insertId]
    );

    return NextResponse.json({
      success: true,
      campaign: (campaigns as any)[0]
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}

