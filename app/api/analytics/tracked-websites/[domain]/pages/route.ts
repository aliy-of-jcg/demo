import { NextRequest, NextResponse } from 'next/server';
import { queryWithMemoryLimit } from '@/lib/clickhouse';
import { requirePermissionWithParams, type AuthContext } from '@/lib/auth/api-middleware';
import { getCache, setCache } from '@/lib/cache/cache';
import { getSettingsWithDefaults } from '@/lib/system-settings';
import { resolveAnalyticsDates } from '@/lib/utils/kst-date';

export const dynamic = 'force-dynamic';

interface PageData {
  page_url: string;
  page_path: string;
  page_title: string;
  unique_visitors: number;
  visits: number;
  pageviews: number;
  conversions: number;
  conversion_rate: number;
  avg_time_on_page: number;
  first_seen: string;
  last_seen: string;
}

export const GET = requirePermissionWithParams('analytics:read', async (
  request: NextRequest,
  context: AuthContext,
  routeParams: { params: Record<string, string> }
) => {
  const cacheTtlMs = 300_000; // 5 minutes
  try {
    const { params } = routeParams;
    const domain = decodeURIComponent(params.domain);
    const searchParams = request.nextUrl.searchParams;
    const MAX_RANGE_DAYS = 90;

    const settings = await getSettingsWithDefaults();
    const defaultDays = settings.default_date_range ?? 7;

    const { startDate, endDate } = resolveAnalyticsDates(searchParams, {
      endParam: 'end',
      startParam: 'start',
      defaultRangeDays: defaultDays,
      maxRangeDays: MAX_RANGE_DAYS
    });

    // Normalize domain (remove www., lowercase)
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');

    console.log(`📄 Page Breakdown - Domain: ${normalizedDomain}, Date Range: ${startDate} to ${endDate}`);

    const cacheKey = `tracked-websites-pages:${normalizedDomain}:${startDate}:${endDate}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Query to get page-level metrics for the specific domain
    const query = `
      SELECT 
        page_url,
        MAX(page_title) as page_title,
        uniq(user_id) as unique_visitors,
        uniq(session_id) as visits,
        countIf(event_type = 'pageview') as pageviews,
        countIf(event_type = 'conversion') as conversions,
        CASE 
          WHEN uniq(user_id) > 0 
          THEN round((countIf(event_type = 'conversion') / uniq(user_id)) * 100, 2)
          ELSE 0
        END as conversion_rate,
        round(AVG(time_on_page), 0) as avg_time_on_page,
        MIN(timestamp) as first_seen,
        MAX(timestamp) as last_seen
      FROM analytics.visit_logs_buffer
      WHERE created_date_kst BETWEEN toDate('${startDate}') AND toDate('${endDate}')
        AND page_url != ''
        AND page_url IS NOT NULL
        AND lower(if(startsWith(domain(page_url), 'www.'), 
          substring(domain(page_url), 5), 
          domain(page_url))) = '${normalizedDomain}'
      GROUP BY page_url
      ORDER BY unique_visitors DESC
      LIMIT 500
    `;

    const result = await queryWithMemoryLimit(query, {
      format: 'JSONEachRow'
    });

    const pages = await result.json() as Array<Omit<PageData, 'page_path'>>;

    // Extract path from URL for each page
    const pagesWithPath = pages.map(page => {
      let pagePath = '/';
      try {
        const url = new URL(page.page_url);
        pagePath = url.pathname + url.search;
        if (pagePath === '') pagePath = '/';
      } catch {
        // If URL parsing fails, try to extract path manually
        const match = page.page_url.match(/https?:\/\/[^\/]+(\/.*)?/);
        if (match && match[1]) {
          pagePath = match[1];
        }
      }
      return {
        ...page,
        page_path: pagePath
      };
    });

    // Calculate summary stats
    const summary = {
      total_pages: pages.length,
      total_unique_visitors: pages.length > 0 
        ? new Set(pages.flatMap(p => {
            // We can't sum unique visitors across pages (would double-count)
            // So we need a separate query for total unique visitors
            return [];
          })).size 
        : 0,
      total_visits: pages.reduce((sum, p) => sum + parseInt(p.visits.toString()), 0),
      total_pageviews: pages.reduce((sum, p) => sum + parseInt(p.pageviews.toString()), 0),
      total_conversions: pages.reduce((sum, p) => sum + parseInt(p.conversions.toString()), 0),
    };

    // Get total unique visitors across all pages (distinct users who visited any page in this domain)
    try {
      const totalVisitorsQuery = await queryWithMemoryLimit(`
        SELECT countDistinct(user_id) as unique_visitors
        FROM analytics.visit_logs_buffer
        WHERE created_date_kst BETWEEN toDate('${startDate}') AND toDate('${endDate}')
          AND page_url != ''
          AND page_url IS NOT NULL
          AND lower(if(startsWith(domain(page_url), 'www.'), 
            substring(domain(page_url), 5), 
            domain(page_url))) = '${normalizedDomain}'
      `, { format: 'JSONEachRow' });

      const totalVisitorsResult = await totalVisitorsQuery.json() as Array<{ unique_visitors: number }>;
      summary.total_unique_visitors = totalVisitorsResult[0]?.unique_visitors || 0;
    } catch (error) {
      console.warn('Failed to calculate total unique visitors:', error);
    }

    console.log(`✅ Found ${pages.length} pages for domain ${normalizedDomain}`);

    const responsePayload = {
      success: true,
      domain: normalizedDomain,
      dateRange: { start: startDate, end: endDate },
      pages: pagesWithPath.map(p => ({
        page_url: p.page_url,
        page_path: p.page_path || '/',
        page_title: p.page_title || '',
        unique_visitors: parseInt(p.unique_visitors.toString()),
        visits: parseInt(p.visits.toString()),
        pageviews: parseInt(p.pageviews.toString()),
        conversions: parseInt(p.conversions.toString()),
        conversion_rate: parseFloat(p.conversion_rate.toString()) || 0,
        avg_time_on_page: Math.round(parseFloat(p.avg_time_on_page.toString()) || 0),
        first_seen: p.first_seen,
        last_seen: p.last_seen,
      })),
      summary: summary
    };

    await setCache(cacheKey, responsePayload, cacheTtlMs);

    return NextResponse.json(responsePayload);

  } catch (error) {
    console.error('❌ Page Breakdown API Error:', error);
    const normalizedError = error instanceof Error
      ? error
      : new Error('Unexpected server error');
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch page breakdown data',
        message: normalizedError.message
      },
      { status: 500 }
    );
  }
});

