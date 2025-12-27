import { NextRequest, NextResponse } from 'next/server';
import clickhouse, { queryWithMemoryLimit } from '@/lib/clickhouse';
import { getPool } from '@/lib/mysql';
import { RowDataPacket } from 'mysql2';
import { requirePermission, type AuthContext } from '@/lib/auth/api-middleware';
import { getDefaultTimezone } from '@/lib/system-settings';
import { getCache, setCache } from '@/lib/cache/cache';
import { resolveAnalyticsDates } from '@/lib/utils/kst-date';
import { normalizeUtmAttribution, buildAttributionWhereClause } from '@/lib/utils/utm-normalization';

export const dynamic = 'force-dynamic';

// Helper function to normalize domain (extract domain from URL)
function normalizeDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    let domain = urlObj.hostname.toLowerCase();
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }
    return domain;
  } catch (error) {
    return '';
  }
}

const sectionName = 'utm-breakdown';

export const GET = requirePermission('analytics:read', async (request: NextRequest, context: AuthContext) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const campaignId = searchParams.get('campaign_id');
    const platform = searchParams.get('platform');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: 'campaign_id is required' },
        { status: 400 }
      );
    }

    console.log(sectionName);

    const pool = getPool();

    // Get campaign details
    const [campaignRows] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, co.name as course_name 
       FROM campaigns c 
       LEFT JOIN courses co ON c.course_id = co.id 
       WHERE c.id = ?`,
      [campaignId]
    );

    if (campaignRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const campaign = campaignRows[0];

    // Get timezone from system settings
    const timezone = await getDefaultTimezone();

    // Add date filtering with default and max enforcement
    const MAX_RANGE_DAYS = 90;

    const dates = resolveAnalyticsDates(searchParams, {
      endParam: 'end_date',
      startParam: 'start_date',
      defaultRangeDays: 30,
      maxRangeDays: MAX_RANGE_DAYS
    });

    const finalStartDate = dates.startDate;
    const finalEndDate = dates.endDate;

    // Check cache (30 seconds TTL)
    const cacheTtlMs = 30_000;
    const cacheKey = `campaign-analysis-${sectionName}:${campaignId}:${finalStartDate}:${finalEndDate}:${platform || 'all'}:${timezone}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Get all tracking codes for this campaign
    // CRITICAL: Include utm_term in SELECT - was missing!
    const [trackingCodes] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, tracking_code, utm_campaign, utm_source, utm_medium, utm_content, utm_term, status, budget, spent, landing_url FROM utm_codes WHERE campaign_id = ?',
      [campaignId]
    );

    if (trackingCodes.length === 0) {
      return NextResponse.json({
        success: true,
        utmBreakdown: [],
        nonLegacyMetrics: {
          visitors: 0,
          conversions: 0,
          conversionRate: '0.00',
          clicks: 0,
          ctr: '0.00',
        },
      });
    }

    const validTrackingCodes = trackingCodes
      .map(tc => tc.tracking_code)
      .filter(code => code && code !== '');

    // Batch check which landing page domains are tracked
    const landingDomains = new Set<string>();
    trackingCodes.forEach(tc => {
      if (tc.landing_url) {
        const domain = normalizeDomain(tc.landing_url);
        if (domain) {
          landingDomains.add(domain);
        }
      }
    });

    const trackedDomainsSet = new Set<string>();
    if (landingDomains.size > 0) {
      try {
        const domainsList = Array.from(landingDomains).map(d => `'${d.replace(/'/g, "\\'")}'`).join(',');
        const [trackedDomains] = await pool.query<RowDataPacket[]>(
          `SELECT domain FROM tracked_websites WHERE domain IN (${domainsList}) AND is_enabled = 1`
        );
        trackedDomains.forEach((row: any) => {
          trackedDomainsSet.add(row.domain);
        });
      } catch (error) {
        console.error('Error checking tracked domains:', error);
      }
    }

    // Batch fetch all clicks, visits, and daily data in 3 queries (instead of 3N queries)
    // CRITICAL: Use exact attribution matching to prevent historical data inheritance
    /**
     * Attribution identity is defined by:
     * tracking_code + landing_url + all UTM params.
     * Any change creates a new identity and resets metrics.
     */

    const activeTrackingCodes = trackingCodes.filter(tc => tc.status !== 'hidden');
    const activeTrackingCodesList = activeTrackingCodes
      .map(tc => tc.tracking_code)
      .filter(code => code && code !== '');

    // Build platform filter for WHERE clause
    const platformFilter = platform && platform !== 'all'
      ? ` AND (utm_medium = '${platform.replace(/'/g, "\\'")}' OR utm_source = '${platform.replace(/'/g, "\\'")}')`
      : '';

    // 1. Batch query for clicks - GROUP BY all attribution fields
    const clicksMap = new Map<string, number>(); // compositeKey -> clicks
    if (activeTrackingCodesList.length > 0) {
      try {
        const escapedCodes = activeTrackingCodesList.map(code => `'${code.replace(/'/g, "\\'")}'`).join(',');
        const clicksQuery = `
          SELECT 
            tracking_code,
            landing_url,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            utm_term,
            COUNT(*) as total_clicks
          FROM analytics.tracking_events_buffer
          WHERE tracking_code IN (${escapedCodes})
            AND created_date >= toDate('${finalStartDate}')
            AND created_date <= toDate('${finalEndDate}')
          GROUP BY 
            tracking_code,
            landing_url,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            utm_term
        `;

        const clicksResult = await queryWithMemoryLimit(clicksQuery, {
          format: 'JSONEachRow'
        });

        const clicksData = await clicksResult.json() as any[];
        clicksData.forEach((row: any) => {
          const normalizedAttribution = normalizeUtmAttribution({
            landing_url: row.landing_url || '',
            utm_source: row.utm_source || '',
            utm_medium: row.utm_medium || '',
            utm_campaign: row.utm_campaign || '',
            utm_content: row.utm_content || '',
            utm_term: row.utm_term || '',
          });

          const compositeKey = `${row.tracking_code}::${normalizedAttribution.landing_url}::${normalizedAttribution.utm_source}::${normalizedAttribution.utm_medium}::${normalizedAttribution.utm_campaign}::${normalizedAttribution.utm_content}::${normalizedAttribution.utm_term}`;
          clicksMap.set(compositeKey, parseInt(row.total_clicks) || 0);
        });
      } catch (error) {
        console.error('Error fetching clicks:', error);
      }
    }

    // 2. Batch query for visits - GROUP BY all attribution fields
    const visitsMap = new Map<string, { visitors: number; conversions: number }>(); // compositeKey -> {visitors, conversions}
    if (activeTrackingCodesList.length > 0) {
      try {
        const escapedCodes = activeTrackingCodesList.map(code => `'${code.replace(/'/g, "\\'")}'`).join(',');
        const visitsQuery = `
          SELECT 
            tracking_code,
            landing_url,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            utm_term,
            countDistinct(user_id) as unique_visitors,
            countIf(event_type = 'conversion') as conversions
          FROM analytics.visit_logs_buffer
          WHERE tracking_code IN (${escapedCodes})
            AND created_date_kst >= toDate('${finalStartDate}')
            AND created_date_kst <= toDate('${finalEndDate}')
            ${platformFilter}
          GROUP BY 
            tracking_code,
            landing_url,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            utm_term
        `;

        const visitsResult = await queryWithMemoryLimit(visitsQuery, {
          format: 'JSONEachRow'
        });

        const visitsData = await visitsResult.json() as any[];
        visitsData.forEach((row: any) => {
          const normalizedAttribution = normalizeUtmAttribution({
            landing_url: row.landing_url || '',
            utm_source: row.utm_source || '',
            utm_medium: row.utm_medium || '',
            utm_campaign: row.utm_campaign || '',
            utm_content: row.utm_content || '',
            utm_term: row.utm_term || '',
          });

          const compositeKey = `${row.tracking_code}::${normalizedAttribution.landing_url}::${normalizedAttribution.utm_source}::${normalizedAttribution.utm_medium}::${normalizedAttribution.utm_campaign}::${normalizedAttribution.utm_content}::${normalizedAttribution.utm_term}`;
          visitsMap.set(compositeKey, {
            visitors: parseInt(row.unique_visitors) || 0,
            conversions: parseInt(row.conversions) || 0,
          });
        });
      } catch (error) {
        console.error('Error fetching visits:', error);
      }
    }

    // 3. Batch query for daily data - GROUP BY date + all attribution fields
    const dailyDataMap = new Map<string, Array<{ date: string; visitors: number; conversions: number }>>(); // compositeKey -> daily data array
    if (activeTrackingCodesList.length > 0) {
      try {
        const escapedCodes = activeTrackingCodesList.map(code => `'${code.replace(/'/g, "\\'")}'`).join(',');
        const dailyQuery = `
          SELECT 
            tracking_code,
            landing_url,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            utm_term,
            toDate(toTimeZone(timestamp, '${timezone}')) as date,
            countDistinct(user_id) as visitors,
            countIf(event_type = 'conversion') as conversions
          FROM analytics.visit_logs_buffer
          WHERE tracking_code IN (${escapedCodes})
            AND created_date_kst >= toDate('${finalStartDate}')
            AND created_date_kst <= toDate('${finalEndDate}')
            ${platformFilter}
          GROUP BY 
            tracking_code,
            landing_url,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            utm_term,
            date
          ORDER BY 
            tracking_code,
            landing_url,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            utm_term,
            date ASC
        `;

        const dailyResult = await queryWithMemoryLimit(dailyQuery, {
          format: 'JSONEachRow'
        });

        const dailyData = await dailyResult.json() as any[];
        dailyData.forEach((row: any) => {
          const normalizedAttribution = normalizeUtmAttribution({
            landing_url: row.landing_url || '',
            utm_source: row.utm_source || '',
            utm_medium: row.utm_medium || '',
            utm_campaign: row.utm_campaign || '',
            utm_content: row.utm_content || '',
            utm_term: row.utm_term || '',
          });

          const compositeKey = `${row.tracking_code}::${normalizedAttribution.landing_url}::${normalizedAttribution.utm_source}::${normalizedAttribution.utm_medium}::${normalizedAttribution.utm_campaign}::${normalizedAttribution.utm_content}::${normalizedAttribution.utm_term}`;

          if (!dailyDataMap.has(compositeKey)) {
            dailyDataMap.set(compositeKey, []);
          }
          dailyDataMap.get(compositeKey)!.push({
            date: row.date,
            visitors: parseInt(row.visitors) || 0,
            conversions: parseInt(row.conversions) || 0,
          });
        });
      } catch (error) {
        console.error('Error fetching daily data:', error);
      }
    }

    // Map results back to UTMs by matching exact attribution
    const utmBreakdown = activeTrackingCodes.map(tc => {
      const trackingCode = tc.tracking_code || '';

      // Get current attribution from MySQL and normalize (source of truth)
      const currentAttribution = normalizeUtmAttribution({
        utm_source: tc.utm_source,
        utm_medium: tc.utm_medium,
        utm_campaign: tc.utm_campaign,
        utm_content: tc.utm_content,
        utm_term: tc.utm_term,
        landing_url: tc.landing_url,
      });

      // Build composite key matching MySQL attribution (exact match)
      const compositeKey = `${trackingCode}::${currentAttribution.landing_url}::${currentAttribution.utm_source}::${currentAttribution.utm_medium}::${currentAttribution.utm_campaign}::${currentAttribution.utm_content}::${currentAttribution.utm_term}`;

      // Get metrics from maps
      const clicks = clicksMap.get(compositeKey) || 0;
      const visitsData = visitsMap.get(compositeKey) || { visitors: 0, conversions: 0 };
      const dailyData = dailyDataMap.get(compositeKey) || [];

      // Check if landing page is tracked
      let landingPageTracked = true;
      if (tc.landing_url) {
        const domain = normalizeDomain(tc.landing_url);
        landingPageTracked = domain ? trackedDomainsSet.has(domain) : false;
      }

      return {
        id: tc.id,
        name: tc.name,
        tracking_code: trackingCode,
        utm_source: currentAttribution.utm_source,
        utm_medium: currentAttribution.utm_medium,
        utm_content: currentAttribution.utm_content,
        status: tc.status,
        budget: parseFloat(tc.budget) || 0,
        spent: parseFloat(tc.spent) || 0,
        landingPageTracked,
        metrics: {
          clicks,
          visitors: visitsData.visitors,
          conversions: visitsData.conversions,
          conversionRate: visitsData.visitors > 0 ? ((visitsData.conversions / visitsData.visitors) * 100).toFixed(2) : '0.00',
          ctr: clicks > 0 ? ((visitsData.visitors / clicks) * 100).toFixed(2) : '0.00',
        },
        dailyData: dailyData.map(row => ({
          date: row.date,
          visitors: row.visitors,
          conversions: row.conversions,
          conversionRate: row.visitors > 0 ? ((row.conversions / row.visitors) * 100).toFixed(2) : '0.00',
        })),
      };
    });

    // Calculate non-legacy metrics (only from active UTMs)
    const nonLegacyMetrics = {
      visitors: 0,
      conversions: 0,
      clicks: 0,
    };

    utmBreakdown.forEach(utm => {
      nonLegacyMetrics.visitors += utm.metrics.visitors;
      nonLegacyMetrics.conversions += utm.metrics.conversions;
      nonLegacyMetrics.clicks += utm.metrics.clicks;
    });

    const nonLegacyConversionRate = nonLegacyMetrics.visitors > 0
      ? ((nonLegacyMetrics.conversions / nonLegacyMetrics.visitors) * 100).toFixed(2)
      : '0.00';
    const nonLegacyCtr = nonLegacyMetrics.clicks > 0
      ? ((nonLegacyMetrics.visitors / nonLegacyMetrics.clicks) * 100).toFixed(2)
      : '0.00';

    const response = {
      success: true,
      utmBreakdown,
      nonLegacyMetrics: {
        visitors: nonLegacyMetrics.visitors,
        conversions: nonLegacyMetrics.conversions,
        conversionRate: nonLegacyConversionRate,
        clicks: nonLegacyMetrics.clicks,
        ctr: nonLegacyCtr,
      },
    };

    await setCache(cacheKey, response, cacheTtlMs);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Campaign analysis UTM breakdown API error:', error);
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

