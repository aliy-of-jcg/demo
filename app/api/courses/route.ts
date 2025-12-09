import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import clickhouse from '@/lib/clickhouse';
import { requirePermission } from '@/lib/auth/api-middleware';
import type { AuthContext } from '@/lib/auth/types';

// Type definitions for the courses data
interface Course {
  id: number;
  name: string;
  code: string;
  category?: string;
  duration?: number;
  price?: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface EnhancedCourse extends Course {
  active_campaigns: number;
  total_visits: number;
}

interface SummaryData {
  total_courses: number;
  active_courses: number;
}

interface CampaignData {
  course_id: number;
  active_campaigns: number;
}

interface VisitData {
  course_id: number;
  total_visits: number;
}

interface TotalVisitsData {
  total: number;
}

export const GET = requirePermission('courses:read', async (request: NextRequest, context: AuthContext) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || '';

    console.log(`📚 Courses API - Page: ${page}, Limit: ${limit}, Search: ${search || 'none'}, Status: ${status || 'all'}`);

    const pool = getPool();

    // Build WHERE conditions for filtering
    let whereConditions = 'WHERE courses.status != \'hidden\''; // Exclude hidden courses by default
    const queryParams: any[] = [];
    const countParams: any[] = [];

    // Filter by status if provided
    if (status) {
      whereConditions = 'WHERE courses.status = ?';
      queryParams.push(status);
      countParams.push(status);
    }

    if (search) {
      whereConditions += ' AND (courses.name LIKE ? OR courses.code LIKE ? OR courses.category LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM courses ${whereConditions}`;
    const [countResult] = await pool.execute(countQuery, countParams) as [Array<{ total: number }>, any];
    const total = countResult[0].total;

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    let courses: Course[] = [];

    try {
      // Get paginated courses
      const query = `SELECT * FROM courses ${whereConditions} ORDER BY courses.name ASC LIMIT ${limit} OFFSET ${offset}`;
      [courses] = await pool.execute(query, queryParams) as [Course[], any];
    } catch (dbError: any) {
      // Check if table doesn't exist
      if (dbError.code === 'ER_NO_SUCH_TABLE' && dbError.sqlMessage?.includes('courses')) {
        console.warn('⚠️ Courses table does not exist yet');
        return NextResponse.json({
          success: true,
          courses: [],
          summary: {
            total_courses: 0,
            active_courses: 0,
            total_campaigns: 0,
            total_visits: 0
          },
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0
          },
          message: 'No courses data available yet. Database tables will be created automatically.'
        });
      }
      throw dbError;
    }

    // Get summary stats from ALL matching courses (respecting filters)
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_courses,
        COUNT(CASE WHEN courses.status = 'active' THEN 1 END) as active_courses
      FROM courses
      ${whereConditions}
    `;

    const [summaryResult] = await pool.execute(summaryQuery, countParams) as [SummaryData[], any];
    const summary = summaryResult[0];

    // Get ALL matching course IDs (not just paginated) for summary calculation
    const [allMatchingCourses] = await pool.execute(
      `SELECT id FROM courses ${whereConditions}`,
      countParams
    ) as [Array<{ id: number }>, any];
    const allMatchingCourseIds = allMatchingCourses.map(c => c.id);

    // Get total active campaigns per course from MySQL (only for matching courses)
    let campaignsMap = new Map<number, number>();
    let totalCampaigns = 0;

    if (allMatchingCourseIds.length > 0) {
      const placeholders = allMatchingCourseIds.map(() => '?').join(',');
      const campaignsQuery = `
        SELECT 
          course_id,
          COUNT(*) as active_campaigns
        FROM campaigns
        WHERE status = 'active' AND course_id IN (${placeholders})
        GROUP BY course_id
      `;

      const [campaignsResult] = await pool.execute(campaignsQuery, allMatchingCourseIds) as [CampaignData[], any];
      campaignsResult.forEach((row) => {
        campaignsMap.set(row.course_id, row.active_campaigns);
        totalCampaigns += row.active_campaigns;
      });
    }

    // Get total visits per course from ClickHouse
    // First, get all tracking codes and their associated course_ids from utm_codes
    let trackingCodeToCourseId = new Map<string, number>();
    try {
      const [utmCodes] = await pool.execute(
        `SELECT tracking_code, campaign_id FROM utm_codes WHERE tracking_code != '' AND status != 'hidden'`
      ) as [Array<{ tracking_code: string; campaign_id: number }>, any];

      // Get course_id for each campaign
      if (utmCodes.length > 0) {
        const campaignIds = Array.from(new Set(utmCodes.map(utm => utm.campaign_id)));
        const placeholders = campaignIds.map(() => '?').join(',');
        const [campaignRows] = await pool.execute(
          `SELECT id, course_id FROM campaigns WHERE id IN (${placeholders})`,
          campaignIds
        ) as [Array<{ id: number; course_id: number }>, any];

        const campaignToCourseId = new Map<number, number>();
        campaignRows.forEach((row: { id: number; course_id: number }) => {
          campaignToCourseId.set(row.id, row.course_id);
        });

        utmCodes.forEach((utm: { tracking_code: string; campaign_id: number }) => {
          const courseId = campaignToCourseId.get(utm.campaign_id);
          if (courseId) {
            trackingCodeToCourseId.set(utm.tracking_code, courseId);
          }
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to map tracking codes to course IDs:', error);
    }

    let visitsMap = new Map<number, number>();
    try {
      // First, try to get visits by course_id directly (if course_id is populated)
      try {
        const directCourseVisitsQuery = `
          SELECT 
            course_id,
            countDistinct(user_id) as total_visits
          FROM analytics.visit_logs
          WHERE course_id > 0
          GROUP BY course_id
        `;

        const directResult = await clickhouse.query({
          query: directCourseVisitsQuery,
          format: 'JSONEachRow'

        });

        const directVisitsData = await directResult.json() as Array<{ course_id: number; total_visits: number }>;
        directVisitsData.forEach((row) => {
          const currentVisits = visitsMap.get(row.course_id) || 0;
          visitsMap.set(row.course_id, currentVisits + row.total_visits);
        });
      } catch (directError) {
        // Ignore if this query fails, continue with tracking_code approach
        console.warn('⚠️ Direct course_id query failed, using tracking_code approach:', directError);
      }

      // Also query visits by tracking_code and map to course_id
      const visitsQuery = `
        SELECT 
          tracking_code,
          countDistinct(user_id) as total_visits
        FROM analytics.visit_logs
        WHERE tracking_code != ''
        GROUP BY tracking_code
      `;

      const visitsResult = await clickhouse.query({
        query: visitsQuery,
        format: 'JSONEachRow'
      });

      const visitsData = await visitsResult.json() as Array<{ tracking_code: string; total_visits: number }>;
      visitsData.forEach((row) => {
        // Try exact match first
        let courseId = trackingCodeToCourseId.get(row.tracking_code);

        // If no exact match, try trimming whitespace
        if (!courseId) {
          courseId = trackingCodeToCourseId.get(row.tracking_code.trim());
        }

        if (courseId) {
          const currentVisits = visitsMap.get(courseId) || 0;
          visitsMap.set(courseId, currentVisits + row.total_visits);
        }
      });

      // Fallback: Also try matching by UTM parameters if tracking_code didn't work
      // Get all campaigns with their UTM parameters
      try {
        const [utmCampaigns] = await pool.execute(
          `SELECT DISTINCT campaign_id, utm_campaign, utm_source, utm_medium 
           FROM utm_codes 
           WHERE utm_campaign != '' AND status != 'hidden' AND campaign_id IN (
             SELECT id FROM campaigns WHERE course_id IS NOT NULL
           )`
        ) as [Array<{ campaign_id: number; utm_campaign: string; utm_source: string; utm_medium: string }>, any];

        if (utmCampaigns.length > 0) {
          // Get course_id for these campaigns
          const campaignIds = utmCampaigns.map(uc => uc.campaign_id);
          const placeholders = campaignIds.map(() => '?').join(',');
          const [campaignRows] = await pool.execute(
            `SELECT id, course_id FROM campaigns WHERE id IN (${placeholders})`,
            campaignIds
          ) as [Array<{ id: number; course_id: number }>, any];

          const campaignToCourseIdMap = new Map<number, number>();
          campaignRows.forEach((row: { id: number; course_id: number }) => {
            campaignToCourseIdMap.set(row.id, row.course_id);
          });

          // Query visits by UTM parameters
          const utmVisitsQuery = `
            SELECT 
              utm_campaign,
              utm_source,
              utm_medium,
              countDistinct(user_id) as total_visits
            FROM analytics.visit_logs
            WHERE utm_campaign != '' AND tracking_code = ''
            GROUP BY utm_campaign, utm_source, utm_medium
          `;

          try {
            const utmVisitsResult = await clickhouse.query({
              query: utmVisitsQuery,
              format: 'JSONEachRow'
            });

            const utmVisitsData = await utmVisitsResult.json() as Array<{
              utm_campaign: string;
              utm_source: string;
              utm_medium: string;
              total_visits: number
            }>;

            utmVisitsData.forEach((row) => {
              // Find matching campaign by UTM parameters
              const matchingCampaign = utmCampaigns.find(uc =>
                uc.utm_campaign === row.utm_campaign &&
                uc.utm_source === row.utm_source &&
                uc.utm_medium === row.utm_medium
              );

              if (matchingCampaign) {
                const courseId = campaignToCourseIdMap.get(matchingCampaign.campaign_id);
                if (courseId) {
                  const currentVisits = visitsMap.get(courseId) || 0;
                  visitsMap.set(courseId, currentVisits + row.total_visits);
                }
              }
            });
          } catch (utmError) {
            // Ignore UTM matching errors
            console.warn('⚠️ UTM parameter matching failed:', utmError);
          }
        }
      } catch (utmMappingError) {
        console.warn('⚠️ Failed to map UTM parameters to courses:', utmMappingError);
      }
    } catch (chError) {
      console.warn('⚠️ ClickHouse query failed, using 0 for visits:', chError);
      // Continue with 0 visits if ClickHouse fails
    }

    // Calculate total visits for ALL matching courses (not just paginated)
    let totalVisits = 0;
    allMatchingCourseIds.forEach(courseId => {
      totalVisits += visitsMap.get(courseId) || 0;
    });

    // Enhance courses with real analytics
    const enhancedCourses: EnhancedCourse[] = courses.map(course => ({
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
        total_campaigns: totalCampaigns,
        total_visits: totalVisits
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      {
        success: true,
        courses: [],
        summary: {
          total_courses: 0,
          active_courses: 0,
          total_campaigns: 0,
          total_visits: 0
        },
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        },
        message: 'Unable to fetch courses data. Please try again later.'
      },
      { status: 200 }
    );
  }
});

export const POST = requirePermission('courses:create', async (request: NextRequest, context: AuthContext) => {
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
        { success: false, error: 'Course name and code are required' },
        { status: 400 }
      );
    }

    if (!category || category.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Category is required' },
        { status: 400 }
      );
    }

    if (!duration || duration.toString().trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Duration is required' },
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
      category,
      duration,
      price || null,
      status || 'active'
    ]) as [any, any];

    const insertId = (result as any).insertId;

    // Fetch the created course
    const [courses] = await pool.execute('SELECT * FROM courses WHERE id = ?', [insertId]) as [Course[], any];

    return NextResponse.json({
      success: true,
      course: courses[0]
    });
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create course' },
      { status: 500 }
    );
  }
});

