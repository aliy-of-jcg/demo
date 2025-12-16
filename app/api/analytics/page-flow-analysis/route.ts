import { NextRequest, NextResponse } from 'next/server';
import clickhouse, { queryWithMemoryLimit } from '@/lib/clickhouse';
import { requirePermission, type AuthContext } from '@/lib/auth/api-middleware';
import { getCache, setCache } from '@/lib/cache/cache';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('analytics:read', async (request: NextRequest, context: AuthContext) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const MAX_RANGE_DAYS = 90;

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

    console.log(`🔗 Page Flow Analysis API - Date Range: ${startDate} to ${endDate}, Limit: ${limit}, Domain: ${domain || 'all'}, Search: ${search || 'none'}`);

    // Check cache (30 seconds TTL)
    const cacheTtlMs = 30_000; // 30 seconds
    const cacheKey = `page-flow-analysis:${startDate}:${endDate}:${limit}:${domain || 'all'}:${search || 'none'}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Build WHERE clause for date filtering (always apply date filtering for memory safety)
    const whereClause = `toDate(timestamp) >= '${startDate}' AND toDate(timestamp) <= '${endDate}'`;

    // Build filter clause for landing/exit pages (domain and search)
    let pageFilterClause = '';
    if (domain) {
      // Normalize domain (remove www. prefix and convert to lowercase for matching)
      const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
      pageFilterClause += ` AND lower(if(startsWith(domain(page_url), 'www.'), substring(domain(page_url), 5), domain(page_url))) = '${normalizedDomain}'`;
    }
    if (search) {
      // Escape single quotes in search term for SQL
      const escapedSearch = search.replace(/'/g, "''");
      pageFilterClause += ` AND page_url LIKE '%${escapedSearch}%'`;
    }

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

    // 2. UTM Source Breakdown with avg pageviews per session
    // OPTIMIZED: Avoid JOIN - use window functions or direct aggregation
    // Normalize all direct traffic variations to 'Direct'
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

    // 3. Landing Pages with bounce rate and avg pageviews
    // JOIN-FREE: Single-pass aggregation using window functions and conditional logic
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
          AND page_url IN (SELECT page_url FROM top_landing_pages)
      ),
      session_stats AS (
        -- Phase 3: Calculate session-level stats (no JOIN - filter by session_id IN subquery)
        -- Get landing page from visit_logs_buffer where is_landing_page = 1
        SELECT 
          v.session_id,
          MAX(CASE WHEN v.is_landing_page = 1 THEN v.page_url ELSE '' END) as landing_page,
          COUNT(*) as pages_in_session,
          SUM(v.time_on_page) as total_time
        FROM analytics.visit_logs_buffer v
        WHERE ${whereClause}
          AND v.event_type = 'pageview'
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

    // 4. Exit Pages with exit count and exit rate
    // TWO-PHASE PATTERN: Get top exit pages first, then calculate rate only for those
    console.log('🔍 [Page Flow] Executing query 4: Exit Pages');
    const exitPagesQuery = `
      WITH total_sessions AS (
        SELECT uniqExact(session_id) as cnt
        FROM analytics.visit_logs_buffer
        WHERE ${whereClause}
      ),
      top_exit_pages AS (
        -- Phase 1: Get top exit pages by exit count
      SELECT 
        page_url,
          COUNT(*) as exit_count
        FROM analytics.visit_logs_buffer
      WHERE ${whereClause}
        AND is_exit_page = 1
        ${pageFilterClause}
      GROUP BY page_url
        ORDER BY exit_count DESC
        LIMIT ${limit}
      )
      -- Phase 2: Calculate exit rate ONLY for top exit pages
      SELECT 
        tep.page_url,
        tep.exit_count as exits,
        ROUND(tep.exit_count / (SELECT cnt FROM total_sessions) * 100, 1) as exit_rate
      FROM top_exit_pages tep
      ORDER BY exits DESC
    `;

    const exitPagesResult = await queryWithMemoryLimit(exitPagesQuery, {
      format: 'JSONEachRow',
    });

    const exitPagesJson = await exitPagesResult.json() as Array<{
      page_url: string;
      exits: number;
      exit_rate: string;
    }>;
    console.log('✅ [Page Flow] Query 4 completed: Exit Pages rows =', exitPagesJson.length);
    const exitPages = exitPagesJson.map((row) => ({
      page: row.page_url,
      exits: row.exits || 0,
      exitRate: parseFloat(row.exit_rate) || 0,
    }));

    // 5. Average session depth (pages per session)
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

    // Calculate unique landing pages count
    const uniqueLandingPagesCount = landingPages.length;

    // 6. Page Flow Transitions (page-to-page navigation)
    // GA-style pattern: Use window functions instead of JOINs to avoid memory issues
    console.log('🔍 [Page Flow] Executing query 6: Page Transitions');
    const pageTransitionsQuery = `
      WITH transitions AS (
        SELECT
          page_url AS from_page,
          lead(page_url) OVER (
            PARTITION BY session_id
            ORDER BY page_sequence
          ) AS to_page
        FROM analytics.visit_logs_buffer
        WHERE ${whereClause}
          AND event_type = 'pageview'
      )
      SELECT
        from_page,
        to_page,
        COUNT(*) AS transitions
      FROM transitions
      WHERE to_page IS NOT NULL
        AND to_page != from_page
      GROUP BY from_page, to_page
      ORDER BY transitions DESC
      LIMIT 100
    `;

    const pageTransitionsResult = await queryWithMemoryLimit(pageTransitionsQuery, {
      queryMode: 'exploratory', // High-cardinality: many page combinations
      format: 'JSONEachRow',
    });

    const pageTransitionsJson = await pageTransitionsResult.json() as Array<{
      from_page: string;
      to_page: string;
      transitions: number;
    }>;
    console.log('✅ [Page Flow] Query 6 completed: Page Transitions rows =', pageTransitionsJson.length);
    const pageTransitions = pageTransitionsJson.map((row) => ({
      from: row.from_page,
      to: row.to_page,
      count: row.transitions || 0,
    }));

    const response = {
      success: true,
      landingPages,
      exitPages,
      utmBreakdown,
      pageTransitions,
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
    console.error('Page flow analysis API error:', error);
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
