import { NextRequest, NextResponse } from 'next/server';
import { queryWithMemoryLimit } from '@/lib/clickhouse';
import { requirePermission, type AuthContext } from '@/lib/auth/api-middleware';
import { getCache, setCache } from '@/lib/cache/cache';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('analytics:read', async (request: NextRequest, context: AuthContext) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const MAX_RANGE_DAYS = 90;
    const sectionName = 'landing-pages';

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

    // Build filter clause for landing pages (domain and search)
    let pageFilterClause = '';
    if (domain) {
      const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
      pageFilterClause += ` AND lower(if(startsWith(domain(page_url), 'www.'), substring(domain(page_url), 5), domain(page_url))) = '${normalizedDomain}'`;
    }
    if (search) {
      const escapedSearch = search.replace(/'/g, "''");
      pageFilterClause += ` AND page_url LIKE '%${escapedSearch}%'`;
    }

    // Landing Pages with bounce rate and avg pageviews
    console.log('🔍 [Page Flow] Executing query 3: Landing Pages');
    const landingPagesQuery = `
      WITH top_landing_pages AS (
        -- Phase 1: Get top landing pages by session count (lightweight)
        SELECT 
          page_url,
          uniqExact(session_id) as sessions
        FROM analytics.visit_logs_buffer
        WHERE ${whereClause}
          AND is_landing_page = 1
          AND event_type = 'pageview'
          AND utm_source != ''
          ${pageFilterClause}
        GROUP BY page_url
        ORDER BY sessions DESC
        LIMIT ${limit}
      ),
      landing_page_data AS (
        -- Phase 2: Get landing page for each session (no JOIN - WHERE IN)
        SELECT DISTINCT
          session_id,
          page_url as landing_page
        FROM analytics.visit_logs_buffer
        WHERE ${whereClause}
          AND is_landing_page = 1
          AND event_type = 'pageview'
          AND utm_source != ''
          AND page_url IN (SELECT page_url FROM top_landing_pages)
      ),
      session_stats AS (
        -- Phase 3: Calculate session-level stats (no JOIN - filter by session_id IN subquery)
        SELECT 
          v.session_id,
          MAX(CASE WHEN v.is_landing_page = 1 THEN v.page_url ELSE '' END) as landing_page,
          COUNT(*) as pages_in_session,
          SUM(v.time_on_page) as total_time
        FROM analytics.visit_logs_buffer v
        WHERE ${whereClause}
          AND v.event_type = 'pageview'
          AND v.utm_source != ''
          AND v.session_id IN (SELECT session_id FROM landing_page_data)
        GROUP BY v.session_id
      )
      SELECT 
        landing_page as page_url,
        COUNT(*) as visits,
        ROUND(AVG(pages_in_session), 2) as avg_pageviews,
        ROUND(countIf(pages_in_session = 1) / COUNT(*) * 100, 1) as bounce_rate,
        ROUND(AVG(total_time), 0) as avg_time_on_page
      FROM session_stats
      GROUP BY landing_page
      ORDER BY visits DESC
    `;

    const landingPagesResult = await queryWithMemoryLimit(landingPagesQuery, {
      format: 'JSONEachRow',
    });

    const landingPagesJson = await landingPagesResult.json() as Array<{
      page_url: string;
      visits: number;
      avg_pageviews: string;
      bounce_rate: string;
      avg_time_on_page: number;
    }>;
    console.log('✅ [Page Flow] Query 3 completed: Landing Pages rows =', landingPagesJson.length);
    const landingPages = landingPagesJson.map((row) => ({
      page: row.page_url,
      visits: row.visits || 0,
      avgPageviews: parseFloat(row.avg_pageviews) || 0,
      bounceRate: parseFloat(row.bounce_rate) || 0,
      avgTimeOnPage: Math.round(row.avg_time_on_page || 0),
    }));

    const response = {
      success: true,
      landingPages,
    };

    await setCache(cacheKey, response, cacheTtlMs);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Page flow landing pages API error:', error);
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

