import { NextRequest, NextResponse } from 'next/server';
import { queryWithMemoryLimit } from '@/lib/clickhouse';
import { requirePermission, type AuthContext } from '@/lib/auth/api-middleware';
import { getCache, setCache } from '@/lib/cache/cache';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('analytics:read', async (request: NextRequest, context: AuthContext) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const MAX_RANGE_DAYS = 90;
    const sectionName = 'exit-pages';

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

    // Build filter clause for exit pages (domain and search)
    let pageFilterClause = '';
    if (domain) {
      const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
      pageFilterClause += ` AND lower(if(startsWith(domain(page_url), 'www.'), substring(domain(page_url), 5), domain(page_url))) = '${normalizedDomain}'`;
    }
    if (search) {
      const escapedSearch = search.replace(/'/g, "''");
      pageFilterClause += ` AND page_url LIKE '%${escapedSearch}%'`;
    }

    // Exit Pages with exit count and exit rate
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

    const response = {
      success: true,
      exitPages,
    };

    await setCache(cacheKey, response, cacheTtlMs);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Page flow exit pages API error:', error);
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

