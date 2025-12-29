import { NextRequest, NextResponse } from 'next/server';
import { queryWithMemoryLimit } from '@/lib/clickhouse';
import { getPool } from '@/lib/mysql';
import { requirePermission, type AuthContext } from '@/lib/auth/api-middleware';
import { getCache, setCache } from '@/lib/cache/cache';
import { getSettingsWithDefaults } from '@/lib/system-settings';
import { resolveAnalyticsDates } from '@/lib/utils/kst-date';

export const dynamic = 'force-dynamic';

interface WebsiteData {
  domain: string;
  total_sessions: number;
  unique_visitors: number;
  total_pageviews: number;
  total_conversions: number;
  first_seen: string | null;
  last_seen: string | null;
  is_active: boolean;
  is_enabled: boolean;
  status: 'Active' | 'Inactive' | 'Disabled';
}

// Helper function to check if a domain should be filtered out (invalid domains)
// Note: With strict domain registration, domains with NULL last_seen are valid if explicitly registered
function isInvalidDomain(domain: string, lastSeen: Date | null, firstSeen: Date | null): boolean {
  // 1. IP addresses (raw IPs like 121.65.26.2)
  const ipRegex = /^\d{1,3}(\.\d{1,3}){3}$/;
  if (ipRegex.test(domain)) {
    return true;
  }

  // 2. Localhost / local domains
  const localDomains = ['localhost', '127.0.0.1', '0.0.0.0'];
  if (localDomains.includes(domain.toLowerCase())) {
    return true;
  }

  // 3. *.local domains (e.g., rewardi-v2.local)
  if (domain.toLowerCase().endsWith('.local')) {
    return true;
  }

  // 4. Never-seen websites (last_seen is NULL or epoch date Jan 1, 1970)
  // BUT: With strict domain registration, NULL last_seen is OK if domain was explicitly registered (has first_seen)
  if (lastSeen) {
    const epochDate = new Date('1970-01-01T00:00:00.000Z');
    // Allow small timestamp differences (timezone issues)
    const timeDiff = Math.abs(lastSeen.getTime() - epochDate.getTime());
    if (timeDiff < 1000) { // Less than 1 second difference
      return true;
    }
  } else {
    // NULL last_seen = never seen traffic
    // If domain has first_seen, it was explicitly registered (valid - just no traffic yet)
    // If no first_seen either, it's invalid (shouldn't happen with strict registration)
    if (!firstSeen) {
      return true; // No first_seen and no last_seen = invalid
    }
    // Otherwise, it's a newly registered domain waiting for traffic (valid)
  }

  return false;
}

// Get list of invalid domains to exclude from analytics queries
function getInvalidDomainFilters(trackedDomains: Array<{ domain: string; last_seen: Date | null; first_seen: Date | null }>): string {
  const invalidDomains = trackedDomains
    .filter(d => isInvalidDomain(d.domain, d.last_seen, d.first_seen))
    .map(d => {
      const escaped = d.domain.replace(/'/g, "\\'");
      return `'${escaped}'`;
    });

  return invalidDomains.length > 0 ? invalidDomains.join(', ') : "''"; // Empty string if none, to avoid SQL errors
}

export const GET = requirePermission('analytics:read', async (request: NextRequest, context: AuthContext) => {
  const cacheTtlMs = 300_000; // 5 minutes
  try {
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

    console.log(`📊 Tracked Websites Analysis - Date Range: ${startDate} to ${endDate}`);

    const cacheKey = `tracked-websites:${startDate}:${endDate}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Step 1: Get all tracked websites from MySQL (source of truth)
    const pool = getPool();
    const [mysqlRows] = await pool.execute(
      'SELECT domain, is_enabled, first_seen, last_seen FROM tracked_websites ORDER BY domain'
    ) as [any[], any];

    const allTrackedDomains = mysqlRows as Array<{
      domain: string;
      is_enabled: number;
      first_seen: Date | null;
      last_seen: Date | null;
    }>;

    // Filter out invalid domains (IPs, localhost, never-seen without registration, etc.)
    // Note: Domains with NULL last_seen but valid first_seen are OK (newly registered, no traffic yet)
    const trackedDomains = allTrackedDomains.filter(d => !isInvalidDomain(d.domain, d.last_seen, d.first_seen));

    // Get list of invalid domains for analytics query exclusion
    const invalidDomainFilters = getInvalidDomainFilters(allTrackedDomains);

    if (trackedDomains.length === 0) {
      const responsePayload = {
        success: true,
        dateRange: { start: startDate, end: endDate },
        websites: [],
        summary: {
          total_websites: 0,
          active_websites: 0,
          inactive_websites: 0,
          disabled_websites: 0,
          total_sessions: 0,
          total_visitors: 0,
          total_pageviews: 0,
          total_conversions: 0,
        }
      };
      await setCache(cacheKey, responsePayload, cacheTtlMs);
      return NextResponse.json(responsePayload);
    }

    // Step 2: Query ClickHouse for metrics in date range for all tracked domains
    // Build domain list for ClickHouse WHERE clause (domains are normalized in query, so only normalized needed)
    const domainList = trackedDomains
      .map(d => {
        const escaped = d.domain.replace(/'/g, "\\'");
        return `'${escaped}'`;
      })
      .join(', ');

    // Exclude internal domains (always exclude these)
    const internalDomains = [
      'dev.cosmosai.co.kr',
      'cosmosai.co.kr'
    ].map(d => `'${d}'`).join(', ');

    // Combine internal domains with invalid domains for query exclusion
    const excludedDomainsList: string[] = [];
    if (internalDomains) {
      excludedDomainsList.push(internalDomains);
    }
    if (invalidDomainFilters && invalidDomainFilters !== "''") {
      excludedDomainsList.push(invalidDomainFilters);
    }
    const excludedDomains = excludedDomainsList.length > 0 ? excludedDomainsList.join(', ') : "''";

    const clickhouseQuery = `
          SELECT 
            lower(if(startsWith(domain(page_url), 'www.'), 
              substring(domain(page_url), 5), 
              domain(page_url))) as normalized_domain,
        uniq(session_id) as total_sessions,
        uniq(user_id) as unique_visitors,
        countIf(event_type = 'pageview') as total_pageviews,
        countIf(event_type = 'conversion') as total_conversions,
        MIN(timestamp) as range_first_seen,
        MAX(timestamp) as range_last_seen
        FROM analytics.visit_logs_buffer
      WHERE created_date_kst BETWEEN toDate('${startDate}') AND toDate('${endDate}')
          AND page_url != ''
          AND page_url IS NOT NULL
          AND domain(page_url) != ''
        AND lower(if(startsWith(domain(page_url), 'www.'), 
          substring(domain(page_url), 5), 
          domain(page_url))) IN (${domainList})
        AND lower(if(startsWith(domain(page_url), 'www.'), 
          substring(domain(page_url), 5), 
          domain(page_url))) NOT IN (${excludedDomains})
      GROUP BY normalized_domain
    `;

    let clickhouseMetrics = new Map<string, {
      total_sessions: number;
      unique_visitors: number;
      total_pageviews: number;
      total_conversions: number;
      range_first_seen: string | null;
      range_last_seen: string | null;
    }>();

    try {
      const result = await queryWithMemoryLimit(clickhouseQuery, {
      format: 'JSONEachRow'
    });
      const metrics = await result.json() as Array<{
        normalized_domain: string;
        total_sessions: number;
        unique_visitors: number;
        total_pageviews: number;
        total_conversions: number;
        range_first_seen: string | null;
        range_last_seen: string | null;
      }>;

      metrics.forEach(m => {
        clickhouseMetrics.set(m.normalized_domain, {
          total_sessions: m.total_sessions,
          unique_visitors: m.unique_visitors,
          total_pageviews: m.total_pageviews,
          total_conversions: m.total_conversions,
          range_first_seen: m.range_first_seen,
          range_last_seen: m.range_last_seen
        });
      });
    } catch (error) {
      console.error('Failed to query ClickHouse metrics:', error);
      // Continue with empty metrics - websites will show 0 values
    }

    // Step 3: Combine MySQL metadata with ClickHouse metrics
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const enrichedWebsites = trackedDomains.map(mysqlRow => {
      const domain = mysqlRow.domain;
      const metrics = clickhouseMetrics.get(domain) || {
        total_sessions: 0,
        unique_visitors: 0,
        total_pageviews: 0,
        total_conversions: 0,
        range_first_seen: null,
        range_last_seen: null
      };

      const isEnabled = mysqlRow.is_enabled === 1;

      // Determine if active: has traffic in last 7 days (from ClickHouse or MySQL last_seen)
      let isActive = false;
      if (metrics.range_last_seen) {
        const lastSeen = new Date(metrics.range_last_seen);
        isActive = lastSeen >= sevenDaysAgo;
      } else if (mysqlRow.last_seen) {
        const lastSeen = new Date(mysqlRow.last_seen);
        isActive = lastSeen >= sevenDaysAgo;
      }

      let status: 'Active' | 'Inactive' | 'Disabled';
      if (!isEnabled) {
        status = 'Disabled';
      } else if (isActive) {
        status = 'Active';
      } else {
        status = 'Inactive';
      }

      // Use MySQL's first_seen/last_seen for historical metadata
      // Use ClickHouse range_last_seen for date range last seen if available
      const lastSeen = metrics.range_last_seen || (mysqlRow.last_seen ? mysqlRow.last_seen.toISOString() : null);

      return {
        domain,
        total_sessions: metrics.total_sessions,
        unique_visitors: metrics.unique_visitors,
        total_pageviews: metrics.total_pageviews,
        total_conversions: metrics.total_conversions,
        first_seen: mysqlRow.first_seen ? mysqlRow.first_seen.toISOString() : null,
        last_seen: lastSeen,
        is_active: isActive,
        is_enabled: isEnabled,
        status
      };
    });

    // Sort by: Active domains first (by last_seen DESC), then inactive/disabled by last_seen DESC
    // Active domains should appear at the top of the list
    enrichedWebsites.sort((a, b) => {
      // Primary sort: Active status (Active > Inactive/Disabled)
      if (a.is_active !== b.is_active) {
        return b.is_active ? 1 : -1;
      }
      
      // Secondary sort: last_seen date (most recent first)
      const aLastSeen = a.last_seen ? new Date(a.last_seen).getTime() : 0;
      const bLastSeen = b.last_seen ? new Date(b.last_seen).getTime() : 0;
      return bLastSeen - aLastSeen;
    });

    // Calculate summary stats
    // IMPORTANT: total_visitors must count distinct users across ALL tracked domains, not sum per-domain counts
    // (Summing would double-count users who visit multiple domains)
    let total_visitors = 0;
    try {
      const totalVisitorsQuery = await queryWithMemoryLimit(`
          SELECT countDistinct(user_id) as unique_visitors
          FROM analytics.visit_logs_buffer
          WHERE created_date_kst BETWEEN toDate('${startDate}') AND toDate('${endDate}')
            AND page_url != ''
            AND page_url IS NOT NULL
            AND domain(page_url) != ''
            AND lower(if(startsWith(domain(page_url), 'www.'), 
              substring(domain(page_url), 5), 
              domain(page_url))) IN (${domainList})
            AND lower(if(startsWith(domain(page_url), 'www.'), 
              substring(domain(page_url), 5), 
              domain(page_url))) NOT IN (${excludedDomains})
        `, { format: 'JSONEachRow' });

      const totalVisitorsResult = await totalVisitorsQuery.json() as Array<{ unique_visitors: number }>;
      total_visitors = totalVisitorsResult[0]?.unique_visitors || 0;
    } catch (error) {
      console.warn('Failed to calculate total visitors across tracked domains:', error);
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

    await setCache(cacheKey, responsePayload, cacheTtlMs);

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

