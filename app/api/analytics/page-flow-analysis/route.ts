import { NextRequest, NextResponse } from 'next/server';
import clickhouse from '@/lib/clickhouse';
import { requirePermission, type AuthContext } from '@/lib/auth/api-middleware';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('analytics:read', async (request: NextRequest, context: AuthContext) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = parseInt(searchParams.get('limit') || '20');
    const domain = searchParams.get('domain');
    const search = searchParams.get('search');

    console.log(`🔗 Page Flow Analysis API - Date Range: ${startDate || 'default'} to ${endDate || 'default'}, Limit: ${limit}, Domain: ${domain || 'all'}, Search: ${search || 'none'}`);

    // Build WHERE clause for date filtering
    let whereClause = '1=1';

    if (startDate) {
      whereClause += ` AND toDate(timestamp) >= '${startDate}'`;
    }
    if (endDate) {
      whereClause += ` AND toDate(timestamp) <= '${endDate}'`;
    }

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
    const totalPageviewsQuery = `
      SELECT COUNT(*) as total_pageviews
      FROM analytics.visit_logs
      WHERE ${whereClause}
        AND event_type = 'pageview'
    `;

    const totalPageviewsResult = await clickhouse.query({
      query: totalPageviewsQuery,
      format: 'JSONEachRow',
    });

    const totalPageviewsJson = await totalPageviewsResult.json() as Array<{ total_pageviews: number }>;
    const totalPageviews = totalPageviewsJson[0]?.total_pageviews || 0;

    // 2. UTM Source Breakdown with avg pageviews per session
    // Normalize all direct traffic variations to 'Direct'
    const utmBreakdownQuery = `
      SELECT 
        CASE 
          WHEN utm_source = '' OR utm_source = '(direct)' OR utm_source = 'Direct' THEN 'Direct'
          ELSE utm_source
        END as utm_source,
        countDistinct(session_id) as total_sessions,
        COUNT(*) as total_pageviews,
        ROUND(COUNT(*) / countDistinct(session_id), 2) as avg_pageviews_per_session
      FROM analytics.visit_logs
      WHERE ${whereClause}
        AND event_type = 'pageview'
      GROUP BY utm_source
      HAVING total_sessions > 0
      ORDER BY total_sessions DESC
      LIMIT 10
    `;

    const utmBreakdownResult = await clickhouse.query({
      query: utmBreakdownQuery,
      format: 'JSONEachRow',
    });

    const utmBreakdownJson = await utmBreakdownResult.json() as Array<{
      utm_source: string;
      total_sessions: number;
      total_pageviews: number;
      avg_pageviews_per_session: string;
    }>;
    const utmBreakdown = utmBreakdownJson.map((row) => ({
      utm_source: row.utm_source,
      total_sessions: row.total_sessions || 0,
      total_pageviews: row.total_pageviews || 0,
      avg_pageviews_per_session: parseFloat(row.avg_pageviews_per_session) || 0,
    }));

    // 3. Landing Pages with bounce rate and avg pageviews
    const landingPagesQuery = `
      WITH landing_page_data AS (
        SELECT 
          session_id,
          page_url as landing_page
        FROM analytics.visit_logs
        WHERE ${whereClause}
          AND is_landing_page = 1
          AND event_type = 'pageview'
          ${pageFilterClause}
      ),
      session_stats AS (
        SELECT 
          l.session_id,
          l.landing_page,
          COUNT(*) as pages_in_session,
          SUM(v.time_on_page) as total_time
        FROM landing_page_data l
        LEFT JOIN analytics.visit_logs v ON l.session_id = v.session_id
        WHERE v.timestamp >= (SELECT MIN(timestamp) FROM analytics.visit_logs WHERE ${whereClause})
          AND v.event_type = 'pageview'
        GROUP BY l.session_id, l.landing_page
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
      LIMIT ${limit}
    `;

    const landingPagesResult = await clickhouse.query({
      query: landingPagesQuery,
      format: 'JSONEachRow',
    });

    const landingPagesJson = await landingPagesResult.json() as Array<{
      page_url: string;
      visits: number;
      avg_pageviews: string;
      bounce_rate: string;
      avg_time_on_page: number;
    }>;
    const landingPages = landingPagesJson.map((row) => ({
      page: row.page_url,
      visits: row.visits || 0,
      avgPageviews: parseFloat(row.avg_pageviews) || 0,
      bounceRate: parseFloat(row.bounce_rate) || 0,
      avgTimeOnPage: Math.round(row.avg_time_on_page || 0),
    }));

    // 4. Exit Pages with exit count and exit rate
    const exitPagesQuery = `
      WITH total_sessions AS (
        SELECT countDistinct(session_id) as cnt
        FROM analytics.visit_logs
        WHERE ${whereClause}
      )
      SELECT 
        page_url,
        COUNT(*) as exits,
        ROUND(COUNT(*) / (SELECT cnt FROM total_sessions) * 100, 1) as exit_rate
      FROM analytics.visit_logs
      WHERE ${whereClause}
        AND is_exit_page = 1
        ${pageFilterClause}
      GROUP BY page_url
      ORDER BY exits DESC
      LIMIT ${limit}
    `;

    const exitPagesResult = await clickhouse.query({
      query: exitPagesQuery,
      format: 'JSONEachRow',
    });

    const exitPagesJson = await exitPagesResult.json() as Array<{
      page_url: string;
      exits: number;
      exit_rate: string;
    }>;
    const exitPages = exitPagesJson.map((row) => ({
      page: row.page_url,
      exits: row.exits || 0,
      exitRate: parseFloat(row.exit_rate) || 0,
    }));

    // 5. Average session depth (pages per session)
    const sessionDepthQuery = `
      SELECT 
        session_id,
        MAX(page_sequence) as max_sequence
      FROM analytics.visit_logs
      WHERE ${whereClause}
      GROUP BY session_id
    `;

    const sessionDepthResult = await clickhouse.query({
      query: sessionDepthQuery,
      format: 'JSONEachRow',
    });

    const sessionDepthJson = await sessionDepthResult.json() as Array<{
      session_id: string;
      max_sequence: number;
    }>;

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

    return NextResponse.json({
      success: true,
      landingPages,
      exitPages,
      utmBreakdown,
      insights: {
        totalSessions,
        totalPageviews,
        avgPageviewsPerSession,
        uniqueLandingPagesCount,
        avgSessionDepth,
      },
    });

  } catch (error) {
    console.error('Page flow analysis API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
});
