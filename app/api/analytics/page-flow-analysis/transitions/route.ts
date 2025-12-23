import { NextRequest, NextResponse } from 'next/server';
import { queryWithMemoryLimit } from '@/lib/clickhouse';
import { requirePermission, type AuthContext } from '@/lib/auth/api-middleware';
import { getCache, setCache } from '@/lib/cache/cache';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('analytics:read', async (request: NextRequest, context: AuthContext) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const MAX_RANGE_DAYS = 90;
    const sectionName = 'transitions';

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
    const whereClause = `created_date_kst >= toDate('${startDate}') AND created_date_kst <= toDate('${endDate}')`;

    // Page Flow Transitions (page-to-page navigation)
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
          AND utm_source != ''
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
      LIMIT 10
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
      pageTransitions,
    };

    await setCache(cacheKey, response, cacheTtlMs);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Page flow transitions API error:', error);
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

