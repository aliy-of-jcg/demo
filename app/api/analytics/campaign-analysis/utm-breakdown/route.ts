import { NextRequest, NextResponse } from 'next/server';
import clickhouse, { queryWithMemoryLimit } from '@/lib/clickhouse';
import { getPool } from '@/lib/mysql';
import { RowDataPacket } from 'mysql2';
import { requirePermission, type AuthContext } from '@/lib/auth/api-middleware';
import { getDefaultTimezone } from '@/lib/system-settings';
import { getCache, setCache } from '@/lib/cache/cache';
import { resolveAnalyticsDates } from '@/lib/utils/kst-date';

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
    const [trackingCodes] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, tracking_code, utm_campaign, utm_source, utm_medium, utm_content, status, budget, spent, landing_url FROM utm_codes WHERE campaign_id = ?',
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

    // Get per-UTM breakdown with metrics and daily data
    const utmBreakdown = await Promise.all(
      trackingCodes
        .filter(tc => tc.status !== 'hidden')
        .map(async (tc) => {
          const trackingCode = tc.tracking_code;
          const utmCampaign = tc.utm_campaign || '';

          // Build WHERE clause for this specific UTM (not entire campaign)
          // Match by tracking_code or utm_campaign when tracking_code is empty/incorrect
          let utmWhereClause = `(tracking_code = '${trackingCode.replace(/'/g, "\\'")}' OR (tracking_code = '' AND utm_campaign = '${utmCampaign.replace(/'/g, "\\'")}'))`;
          utmWhereClause += ` AND created_date_kst >= toDate('${finalStartDate}') AND created_date_kst <= toDate('${finalEndDate}')`;

          // Platform filter
          if (platform && platform !== 'all') {
            const escapedPlatform = platform.replace(/'/g, "\\'");
            utmWhereClause += ` AND (utm_medium = '${escapedPlatform}' OR utm_source = '${escapedPlatform}')`;
          }

          // Get visitors and conversions for this UTM
          const utmVisitQuery = `
            SELECT 
              countDistinct(user_id) as unique_visitors,
              countIf(event_type = 'conversion') as conversions
            FROM analytics.visit_logs_buffer
            WHERE ${utmWhereClause}
          `;

          const utmVisitResult = await queryWithMemoryLimit(utmVisitQuery, {
            format: 'JSONEachRow',
          });

          const utmVisitData = await utmVisitResult.json() as Array<{ unique_visitors: number; conversions: number }>;
          const utmVisitors = utmVisitData[0]?.unique_visitors || 0;
          const utmConversions = utmVisitData[0]?.conversions || 0;

          // Get clicks for this UTM with fallback logic
          // Note: tracking_events_buffer doesn't have campaign_id, only tracking_code, utm_campaign, and campaign_name
          let utmClickWhereClause = `(tracking_code = '${trackingCode.replace(/'/g, "\\'")}' OR (tracking_code = '' AND utm_campaign = '${utmCampaign.replace(/'/g, "\\'")}'))`;
          utmClickWhereClause += ` AND created_date >= toDate('${finalStartDate}') AND created_date <= toDate('${finalEndDate}')`;

          const utmClickQuery = `
            SELECT COUNT(*) as total_clicks
            FROM analytics.tracking_events_buffer
            WHERE ${utmClickWhereClause}
          `;

          const utmClickResult = await queryWithMemoryLimit(utmClickQuery, {
            format: 'JSONEachRow',
          });

          const utmClickData = await utmClickResult.json() as Array<{ total_clicks: number }>;
          const utmClicks = utmClickData[0]?.total_clicks || 0;

          // Get daily data for this UTM
          const utmDailyQuery = `
            SELECT 
              toDate(toTimeZone(timestamp, '${timezone}')) as date,
              countDistinct(user_id) as visitors,
              countIf(event_type = 'conversion') as conversions
            FROM analytics.visit_logs_buffer
            WHERE ${utmWhereClause}
            GROUP BY date
            ORDER BY date ASC
          `;

          const utmDailyResult = await queryWithMemoryLimit(utmDailyQuery, {
            format: 'JSONEachRow',
          });

          const utmDailyJson = await utmDailyResult.json() as Array<{ date: string; visitors: number; conversions: number }>;

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
            utm_source: tc.utm_source,
            utm_medium: tc.utm_medium,
            utm_content: tc.utm_content,
            status: tc.status,
            budget: parseFloat(tc.budget) || 0,
            spent: parseFloat(tc.spent) || 0,
            landingPageTracked,
            metrics: {
              clicks: utmClicks,
              visitors: utmVisitors,
              conversions: utmConversions,
              conversionRate: utmVisitors > 0 ? ((utmConversions / utmVisitors) * 100).toFixed(2) : '0.00',
              ctr: utmClicks > 0 ? ((utmVisitors / utmClicks) * 100).toFixed(2) : '0.00',
            },
            dailyData: utmDailyJson.map(row => ({
              date: row.date,
              visitors: row.visitors || 0,
              conversions: row.conversions || 0,
              conversionRate: (row.visitors || 0) > 0 ? (((row.conversions || 0) / (row.visitors || 0)) * 100).toFixed(2) : '0.00',
            })),
          };
        })
    );

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

