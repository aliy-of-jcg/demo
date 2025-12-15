import { NextRequest, NextResponse } from 'next/server';
import clickhouse, { queryWithMemoryLimit } from '@/lib/clickhouse';
import { getPool } from '@/lib/mysql';
import { requirePermission, type AuthContext } from '@/lib/auth/api-middleware';
import { getCache, setCache } from '@/lib/cache/simpleCache';
import { getSettingsWithDefaults } from '@/lib/system-settings';

export const dynamic = 'force-dynamic';

interface WebsiteData {
  domain: string;
  total_sessions: number;
  unique_visitors: number;
  total_pageviews: number;
  total_conversions: number;
  first_seen: string;
  last_seen: string;
  is_active: boolean;
  is_enabled: boolean;
  status: 'Active' | 'Inactive' | 'Disabled';
}

export const GET = requirePermission('analytics:read', async (request: NextRequest, context: AuthContext) => {
  const cacheTtlMs = 300_000; // 5 minutes
  try {
    const searchParams = request.nextUrl.searchParams;
    const MAX_RANGE_DAYS = 90;

    // Get system defaults so we respect global date range config
    const settings = await getSettingsWithDefaults();

    // Get raw date range from query parameters
    let endDate = searchParams.get('end') || new Date().toISOString().split('T')[0];
    let startDate = searchParams.get('start');

    // If no explicit start provided, fall back to system default_date_range
    if (!startDate) {
      const days = settings.default_date_range ?? 7;
      const end = new Date(endDate);
      const start = new Date(end);
      start.setDate(start.getDate() - days);
      startDate = start.toISOString().split('T')[0];
    }

    // Enforce maximum date window (protect ClickHouse)
    const startObj = new Date(startDate);
    const endObj = new Date(endDate);
    const diffMs = endObj.getTime() - startObj.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > MAX_RANGE_DAYS) {
      const clampedStart = new Date(endObj);
      clampedStart.setDate(clampedStart.getDate() - MAX_RANGE_DAYS);
      startDate = clampedStart.toISOString().split('T')[0];
    }

    console.log(`📊 Tracked Websites Analysis - Date Range: ${startDate} to ${endDate}`);

    const cacheKey = `tracked-websites:${startDate}:${endDate}`;
    const cached = getCache<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Query to extract domains from page_url and aggregate metrics
    // OPTIMIZED: Avoid JOIN by using a single pass with WHERE IN (top domains)
    // Normalize domains: remove www. prefix, convert to lowercase, ignore protocol/port
    const query = `
      WITH top_domains AS (
        -- Phase 1: Lightweight - just get top domain list
        SELECT 
          normalized_domain
        FROM (
          SELECT 
            lower(if(startsWith(domain(page_url), 'www.'), 
              substring(domain(page_url), 5), 
              domain(page_url))) as normalized_domain,
            uniqExact(session_id) as session_count
          FROM analytics.visit_logs_buffer
          WHERE toDate(timestamp) BETWEEN toDate('${startDate}') AND toDate('${endDate}')
            AND page_url != ''
            AND page_url IS NOT NULL
            AND domain(page_url) != ''
          GROUP BY normalized_domain
          HAVING normalized_domain NOT IN (
            'dev.cosmosai.co.kr',
            'cosmosai.co.kr',
            'localhost',
            '127.0.0.1',
            '0.0.0.0'
          )
          ORDER BY session_count DESC
          LIMIT 200
        )
      )
      -- Phase 2: Single-pass aggregation on filtered domains (no JOIN)
      SELECT 
        normalized_domain as domain,
        uniqExact(session_id) as total_sessions,
        uniqExact(user_id) as unique_visitors,
        countIf(event_type = 'pageview') as total_pageviews,
        countIf(event_type = 'conversion') as total_conversions,
        MIN(timestamp) as first_seen,
        MAX(timestamp) as last_seen,
        CASE WHEN MAX(timestamp) >= now() - INTERVAL 7 DAY THEN 1 ELSE 0 END as is_active
      FROM (
        SELECT 
          lower(if(startsWith(domain(page_url), 'www.'), 
            substring(domain(page_url), 5), 
            domain(page_url))) as normalized_domain,
          session_id,
          user_id,
          event_type,
          timestamp
        FROM analytics.visit_logs_buffer
        WHERE toDate(timestamp) BETWEEN toDate('${startDate}') AND toDate('${endDate}')
          AND page_url != ''
          AND page_url IS NOT NULL
          AND domain(page_url) != ''
      )
      WHERE normalized_domain IN (SELECT normalized_domain FROM top_domains)
      GROUP BY normalized_domain
      ORDER BY total_sessions DESC
    `;

    const result = await queryWithMemoryLimit(query, {
      format: 'JSONEachRow'
    });

    const websites = await result.json() as WebsiteData[];

    // Get enabled/disabled status from MySQL
    const pool = getPool();
    const [mysqlRows] = await pool.execute(
      'SELECT domain, is_enabled FROM tracked_websites'
    );
    const domainStatusMap = new Map<string, boolean>();
    (mysqlRows as any[]).forEach(row => {
      domainStatusMap.set(row.domain, row.is_enabled === 1);
    });

    // Enrich websites with is_enabled and calculate status
    const enrichedWebsites = websites.map(website => {
      const isEnabled = domainStatusMap.get(website.domain) ?? true; // Default to enabled if not in MySQL
      let status: 'Active' | 'Inactive' | 'Disabled';

      if (!isEnabled) {
        status = 'Disabled';
      } else if (website.is_active) {
        status = 'Active';
      } else {
        status = 'Inactive';
      }

      return {
        ...website,
        is_enabled: isEnabled,
        status
      };
    });

    // Calculate summary stats
    // IMPORTANT: total_visitors must count distinct users across ALL domains, not sum per-domain counts
    // (Summing would double-count users who visit multiple domains)
    let total_visitors = 0;
    try {
      const totalVisitorsQuery = await queryWithMemoryLimit(`
          SELECT countDistinct(user_id) as unique_visitors
          FROM analytics.visit_logs_buffer
          WHERE toDate(timestamp) BETWEEN toDate('${startDate}') AND toDate('${endDate}')
            AND page_url != ''
            AND page_url IS NOT NULL
            AND domain(page_url) != ''
            AND lower(if(startsWith(domain(page_url), 'www.'), 
              substring(domain(page_url), 5), 
              domain(page_url))) NOT IN (
              'dev.cosmosai.co.kr',
              'cosmosai.co.kr',
              'localhost',
              '127.0.0.1',
              '0.0.0.0'
            )
        `, { format: 'JSONEachRow' });

      const totalVisitorsResult = await totalVisitorsQuery.json() as Array<{ unique_visitors: number }>;
      total_visitors = totalVisitorsResult[0]?.unique_visitors || 0;
    } catch (error) {
      console.warn('Failed to calculate total visitors across all domains:', error);
      // Fallback to sum (less accurate but won't break)
      total_visitors = enrichedWebsites.reduce((sum, w) => sum + parseInt(w.unique_visitors.toString()), 0);
    }

    const summary = {
      total_websites: enrichedWebsites.length,
      active_websites: enrichedWebsites.filter(w => w.status === 'Active').length,
      inactive_websites: enrichedWebsites.filter(w => w.status === 'Inactive').length,
      disabled_websites: enrichedWebsites.filter(w => w.status === 'Disabled').length,
      total_sessions: enrichedWebsites.reduce((sum, w) => sum + parseInt(w.total_sessions.toString()), 0),
      total_visitors: total_visitors, // Distinct users across all domains
      total_pageviews: enrichedWebsites.reduce((sum, w) => sum + parseInt(w.total_pageviews.toString()), 0),
      total_conversions: enrichedWebsites.reduce((sum, w) => sum + parseInt(w.total_conversions.toString()), 0),
    };

    console.log(`✅ Found ${enrichedWebsites.length} tracked websites (${summary.active_websites} active, ${summary.disabled_websites} disabled)`);

    const responsePayload = {
      success: true,
      dateRange: { start: startDate, end: endDate },
      websites: enrichedWebsites,
      summary: summary
    };

    setCache(cacheKey, responsePayload, cacheTtlMs);

    return NextResponse.json(responsePayload);

  } catch (error) {
    console.error('❌ Tracked Websites Analysis API Error:', error);
    const normalizedError = error instanceof Error
      ? error
      : new Error('Unexpected server error');
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tracked websites data',
        message: normalizedError.message
      },
      { status: 500 }
    );
  }
});

