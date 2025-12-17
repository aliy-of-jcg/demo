import { NextRequest, NextResponse } from 'next/server';
import { queryWithMemoryLimit } from '@/lib/clickhouse';
import { requirePermission, type AuthContext } from '@/lib/auth/api-middleware';
import { getCache, setCache } from '@/lib/cache/cache';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('analytics:read', async (request: NextRequest, context: AuthContext) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const MAX_RANGE_DAYS = 90;
    const sectionName = 'insights';

    // Get date range from query parameters (default: last 30 days)
    let endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0];
    let startDate = searchParams.get('start_date');

    if (!startDate) {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      startDate = date.toISOString().split('T')[0];
    }

    // Enforce maximum date window (server-side safety net)
    const startObj = new Date(startDate);
    const endObj = new Date(endDate);
    const diffMs = endObj.getTime() - startObj.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > MAX_RANGE_DAYS) {
      const clampedStart = new Date(endObj);
      clampedStart.setDate(clampedStart.getDate() - MAX_RANGE_DAYS);
      startDate = clampedStart.toISOString().split('T')[0];
    }

    const limit = parseInt(searchParams.get('limit') || '20');
    const domain = searchParams.get('domain');
    const search = searchParams.get('search');

    console.log(`🔍 [Page Flow] Fetching: ${sectionName}`, {
      startDate,
      endDate,
      limit,
      domain: domain || 'all',
      search: search || 'none'
    });

    // Check cache (30 seconds TTL)
    const cacheTtlMs = 30_000; // 30 seconds
    const cacheKey = `page-flow-analysis-${sectionName}:${startDate}:${endDate}:${limit}:${domain || 'all'}:${search || 'none'}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Build WHERE clause for date filtering
    const whereClause = `toDate(timestamp) >= '${startDate}' AND toDate(timestamp) <= '${endDate}'`;

    // 1. Total Pageviews
    console.log('🔍 [Page Flow] Executing query 1: Total Pageviews');
    const totalPageviewsQuery = `
      SELECT COUNT(*) as total_pageviews
      FROM analytics.visit_logs_buffer
      WHERE ${whereClause}
        AND event_type = 'pageview'
    `;

    const totalPageviewsResult = await queryWithMemoryLimit(totalPageviewsQuery, {
      format: 'JSONEachRow',
    });

    const totalPageviewsJson = await totalPageviewsResult.json() as Array<{ total_pageviews: number }>;
    const totalPageviews = totalPageviewsJson[0]?.total_pageviews || 0;
    console.log('✅ [Page Flow] Query 1 completed: Total Pageviews =', totalPageviews);

    // 2. Average session depth (pages per session)
    console.log('🔍 [Page Flow] Executing query 5: Session Depth');
    const sessionDepthQuery = `
      SELECT 
        session_id,
        MAX(page_sequence) as max_sequence
      FROM analytics.visit_logs_buffer
      WHERE ${whereClause}
      GROUP BY session_id
    `;

    const sessionDepthResult = await queryWithMemoryLimit(sessionDepthQuery, {
      format: 'JSONEachRow',
    });

    const sessionDepthJson = await sessionDepthResult.json() as Array<{
      session_id: string;
      max_sequence: number;
    }>;
    console.log('✅ [Page Flow] Query 5 completed: Session Depth rows =', sessionDepthJson.length);

    const sessionDepths = sessionDepthJson.map((row) => row.max_sequence || 1);
    const totalSessions = sessionDepths.length;
    const avgSessionDepth = totalSessions > 0
      ? (sessionDepths.reduce((sum: number, depth: number) => sum + depth, 0) / totalSessions).toFixed(2)
      : '0.00';

    // Calculate average pageviews per session
    const avgPageviewsPerSession = totalSessions > 0
      ? (totalPageviews / totalSessions).toFixed(2)
      : '0.00';

    // Get unique landing pages count (lightweight query)
    const uniqueLandingPagesQuery = `
      SELECT COUNT(DISTINCT page_url) as unique_count
      FROM analytics.visit_logs_buffer
      WHERE ${whereClause}
        AND is_landing_page = 1
        AND event_type = 'pageview'
    `;

    const uniqueLandingPagesResult = await queryWithMemoryLimit(uniqueLandingPagesQuery, {
      format: 'JSONEachRow',
    });

    const uniqueLandingPagesJson = await uniqueLandingPagesResult.json() as Array<{ unique_count: number }>;
    const uniqueLandingPagesCount = uniqueLandingPagesJson[0]?.unique_count || 0;

    const response = {
      success: true,
      insights: {
        totalSessions,
        totalPageviews,
        avgPageviewsPerSession,
        uniqueLandingPagesCount,
        avgSessionDepth,
      },
    };

    await setCache(cacheKey, response, cacheTtlMs);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Page flow insights API error:', error);
    const normalizedError = error instanceof Error
      ? error
      : new Error('Unexpected server error');
    return NextResponse.json(
      {
        success: false,
        error: normalizedError.message
      },
      { status: 500 }
    );
  }
});

