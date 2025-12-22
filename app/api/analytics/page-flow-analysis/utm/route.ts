import { NextRequest, NextResponse } from 'next/server';
import { queryWithMemoryLimit } from '@/lib/clickhouse';
import { requirePermission, type AuthContext } from '@/lib/auth/api-middleware';
import { getCache, setCache } from '@/lib/cache/cache';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('analytics:read', async (request: NextRequest, context: AuthContext) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const MAX_RANGE_DAYS = 90;
    const sectionName = 'utm';

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

    // UTM Source Breakdown with avg pageviews per session
    console.log('🔍 [Page Flow] Executing query 2: UTM Source Breakdown');
    const utmBreakdownQuery = `
      WITH top_sources AS (
        -- Phase 1: Get top UTM sources by session count
        SELECT 
          CASE 
            WHEN utm_source = '' OR utm_source = '(direct)' OR utm_source = 'Direct' THEN 'Direct'
            ELSE utm_source
          END as utm_source
        FROM (
          SELECT 
            utm_source,
            uniqExact(session_id) as session_count
          FROM analytics.visit_logs_buffer
          WHERE ${whereClause}
            AND event_type = 'pageview'
            AND utm_source != ''
          GROUP BY utm_source
          HAVING session_count > 0
          ORDER BY session_count DESC
          LIMIT 10
        )
      )
      -- Phase 2: Aggregate ONLY for top 10 sources (no JOIN - use WHERE IN)
      SELECT 
        CASE 
          WHEN utm_source = '' OR utm_source = '(direct)' OR utm_source = 'Direct' THEN 'Direct'
          ELSE utm_source
        END as utm_source,
        uniqExact(session_id) as total_sessions,
        COUNT(*) as total_pageviews,
        ROUND(COUNT(*) / uniqExact(session_id), 2) as avg_pageviews_per_session
      FROM analytics.visit_logs_buffer
      WHERE ${whereClause}
        AND event_type = 'pageview'
        AND utm_source != ''
        AND (
          CASE 
            WHEN utm_source = '' OR utm_source = '(direct)' OR utm_source = 'Direct' THEN 'Direct'
            ELSE utm_source
          END
        ) IN (SELECT utm_source FROM top_sources)
      GROUP BY utm_source
      ORDER BY total_sessions DESC
    `;

    const utmBreakdownResult = await queryWithMemoryLimit(utmBreakdownQuery, {
      format: 'JSONEachRow',
    });

    const utmBreakdownJson = await utmBreakdownResult.json() as Array<{
      utm_source: string;
      total_sessions: number;
      total_pageviews: number;
      avg_pageviews_per_session: string;
    }>;
    console.log('✅ [Page Flow] Query 2 completed: UTM Breakdown rows =', utmBreakdownJson.length);
    const utmBreakdown = utmBreakdownJson.map((row) => ({
      utm_source: row.utm_source,
      total_sessions: row.total_sessions || 0,
      total_pageviews: row.total_pageviews || 0,
      avg_pageviews_per_session: parseFloat(row.avg_pageviews_per_session) || 0,
    }));

    const response = {
      success: true,
      utmBreakdown,
    };

    await setCache(cacheKey, response, cacheTtlMs);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Page flow UTM API error:', error);
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

