import { NextRequest, NextResponse } from 'next/server';
import clickhouse, { insertWithMemoryLimit } from '@/lib/clickhouse';
import { nanoid } from 'nanoid';
import { getPool } from '@/lib/mysql';
import { getSettingsWithDefaults } from '@/lib/system-settings';
import { parseRequestBody } from '@/lib/utils/parse-request-body';
import { isTransientInfraError, isLikelyBugOrSchemaError, cachedOrFailOpen } from '@/lib/utils/db-error-handler';
import { getCurrentDateKST } from '@/lib/utils/kst-date';
import { sendTelegramNotification } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

// In-memory cache for domain status (refreshed every 5 minutes)
let domainCache: Map<string, { is_enabled: boolean; last_refresh: number; updated_at: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Helper function to normalize domain
function normalizeDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    let domain = urlObj.hostname.toLowerCase();
    // Remove www. prefix
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }
    return domain;
  } catch (error) {
    return '';
  }
}

// Check if domain is registered and enabled (strict registration - no auto-registration)
async function isDomainRegisteredAndEnabled(domain: string): Promise<{ registered: boolean; enabled: boolean }> {
  if (!domain) return { registered: false, enabled: false };

  const now = Date.now();
  const cached = domainCache.get(domain);

  const pool = getPool();
  try {
    const [rows] = await pool.execute(
      'SELECT is_enabled, updated_at FROM tracked_websites WHERE domain = ?',
      [domain]
    );
    const domainRows = rows as any[];

    if (domainRows.length > 0) {
      // Domain exists in database
      const isEnabled = domainRows[0].is_enabled === 1;
      const dbUpdatedAt = new Date(domainRows[0].updated_at).getTime();

      // If we have a cache entry, check if DB was updated after cache was refreshed
      if (cached) {
        // If DB is newer than cache, or status changed, update cache
        if (dbUpdatedAt > cached.updated_at || cached.is_enabled !== isEnabled) {
          console.log(`🔄 Cache invalidated for ${domain}: DB updated at ${new Date(dbUpdatedAt).toISOString()}, cache from ${new Date(cached.updated_at).toISOString()}`);
          domainCache.set(domain, { is_enabled: isEnabled, last_refresh: now, updated_at: dbUpdatedAt });
          return { registered: true, enabled: isEnabled };
        }

        // Cache is still valid (DB hasn't been updated since cache refresh)
        // Return cached value if it's still fresh
        if ((now - cached.last_refresh) < CACHE_TTL) {
          return { registered: true, enabled: cached.is_enabled };
        }

        // Cache is stale, refresh it
        domainCache.set(domain, { is_enabled: isEnabled, last_refresh: now, updated_at: dbUpdatedAt });
        return { registered: true, enabled: isEnabled };
      } else {
        // No cache entry, create one
        domainCache.set(domain, { is_enabled: isEnabled, last_refresh: now, updated_at: dbUpdatedAt });
        return { registered: true, enabled: isEnabled };
      }
    } else {
      // Domain doesn't exist - NOT registered
      return { registered: false, enabled: false };
    }
  } catch (error: any) {
    console.error('Error checking domain registration status', error);
    // On error, fail closed (don't track)
    return { registered: false, enabled: false };
  }
}

// Log detection attempt for unregistered domains
async function logDomainDetection(domain: string, page_url: string): Promise<void> {
  if (!domain) return;

  const pool = getPool();
  try {
    // Check if domain already exists (to determine if this is first detection)
    const [existingRows] = await pool.execute(
      'SELECT detection_count FROM detected_domains WHERE domain = ?',
      [domain]
    );
    const isNewDomain = (existingRows as any[]).length === 0;

    // Upsert: update if exists, insert if not
    await pool.execute(
      `INSERT INTO detected_domains (domain, first_detected_at, last_detected_at, detection_count, sample_page_url)
       VALUES (?, NOW(), NOW(), 1, ?)
       ON DUPLICATE KEY UPDATE
         last_detected_at = NOW(),
         detection_count = detection_count + 1,
         sample_page_url = ?`,
      [domain, page_url, page_url]
    );

    // Send Telegram notification for new domain detections only
    if (isNewDomain) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cosmosai.co.kr';
      // Escape user-provided content to prevent markdown injection
      // Only escape special chars that would break markdown formatting
      const escapedDomain = domain.replace(/[\[\]()*_`]/g, '\\$&');
      const escapedUrl = page_url.replace(/[\[\]()*_`]/g, '\\$&');

      const message = `🔔 *New Domain Detected*\n\n` +
        `Domain: *${escapedDomain}*\n` +
        `Sample URL: ${escapedUrl}\n\n` +
        `This domain has been detected but is not yet registered for tracking\\.\n\n` +
        `[Review and Approve →](${appUrl}/tracked-websites)`;

      // Send notification asynchronously (don't block tracking) with markdown enabled
      sendTelegramNotification(message, true).catch(error => {
        console.error('Error sending Telegram notification:', error);
      });
    }
  } catch (error: any) {
    // Silently fail - detection logging should not block tracking
    console.error('Error logging domain detection:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if tracking is enabled system-wide
    const settings = await getSettingsWithDefaults();
    if (!settings.allow_tracking) {
      return NextResponse.json(
        { success: false, message: 'Tracking is disabled' },
        { status: 403 }
      );
    }

    // Defensive JSON parsing - prevents 500 errors from truncated bodies during deployment
    const { error, body: data } = await parseRequestBody(request);
    if (error) return error;

    const {
      event_type,
      page_url,
      page_title,
      referrer,
      referrer_domain,
      tracking_code,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      session_id,
      user_id,
      visit_count,
      is_new_visitor,
      device_type,
      os,
      browser,
      screen_resolution,
      user_agent,
      time_on_page,
      conversion_type,
      conversion_value,
      conversion_metadata,
      page_sequence,
      is_exit_page,
      session_page_count,
      http_status
    } = data;

    // Validate required fields
    if (!session_id || !user_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Lookup campaign_id, course_id, and landing_url from MySQL
    let campaign_id = 0;
    let course_id = 0;
    let landing_url = '';
    let immutableUtmSource = '';
    let immutableUtmMedium = '';
    let immutableUtmCampaign = '';
    let immutableUtmContent = '';
    let immutableUtmTerm = '';

    const pool = getPool();
    try {
      if (tracking_code && tracking_code !== '') {
        // Primary method: lookup by tracking_code to get campaign info AND landing_url
        // CRITICAL: Capture ALL attribution fields at event time for immutable attribution
        const [utmRows] = await pool.execute(
          'SELECT u.campaign_id, u.landing_url, u.utm_source, u.utm_medium, u.utm_campaign, u.utm_content, u.utm_term, c.course_id FROM utm_codes u LEFT JOIN campaigns c ON u.campaign_id = c.id WHERE u.tracking_code = ? LIMIT 1',
          [tracking_code]
        );

        if ((utmRows as any[]).length > 0) {
          const utmRow = (utmRows as any[])[0];
          campaign_id = utmRow.campaign_id || 0;
          course_id = utmRow.course_id || 0;
          landing_url = utmRow.landing_url || '';

          // Capture immutable attribution from MySQL (normalize NULL to '')
          immutableUtmSource = utmRow.utm_source || '';
          immutableUtmMedium = utmRow.utm_medium || '';
          immutableUtmCampaign = utmRow.utm_campaign || '';
          immutableUtmContent = utmRow.utm_content || '';
          immutableUtmTerm = utmRow.utm_term || '';

          // CRITICAL: Check if landing_url domain is registered and enabled
          // This ensures visits from unregistered/disabled landing URLs are blocked
          // regardless of where the user navigates afterward
          if (landing_url) {
            const landingDomain = normalizeDomain(landing_url);
            if (landingDomain) {
              const landingStatus = await isDomainRegisteredAndEnabled(landingDomain);
              if (!landingStatus.registered) {
                // Log detection attempt for unregistered domain
                await logDomainDetection(landingDomain, landing_url);
                console.log(`🚫 Tracking blocked: landing_url domain ${landingDomain} is not registered (tracking_code: ${tracking_code})`);
                return NextResponse.json({ success: false, message: 'Landing domain not registered' });
              }
              if (!landingStatus.enabled) {
                console.log(`🚫 Tracking blocked: landing_url domain ${landingDomain} is disabled (tracking_code: ${tracking_code})`);
                return NextResponse.json({ success: false, message: 'Landing domain disabled' });
              }
            }
          }
        }
      }

      // Fallback: if no tracking_code match, try matching by utm_campaign name (legacy data)
      if (campaign_id === 0 && utm_campaign && utm_campaign !== '') {
        const [campaignRows] = await pool.execute(
          'SELECT id, course_id FROM campaigns WHERE name = ? LIMIT 1',
          [utm_campaign]
        );

        if ((campaignRows as any[]).length > 0) {
          campaign_id = (campaignRows as any[])[0].id || 0;
          course_id = (campaignRows as any[])[0].course_id || 0;
        }
      }
    } catch (error) {
      // If lookup fails, continue with 0 values (for direct traffic or unmatched UTMs)
      console.error('Error looking up campaign/course ID:', error);
    }

    // Check if current page_url domain is registered and enabled (strict registration)
    // Visits are recorded only for explicitly registered & enabled domains
    const domain = normalizeDomain(page_url);
    const domainStatus = await isDomainRegisteredAndEnabled(domain);

    if (!domainStatus.registered) {
      // Log detection attempt for unregistered domain
      await logDomainDetection(domain, page_url);
      console.log(`🚫 Tracking blocked: domain ${domain} is not registered`);
      return NextResponse.json({ success: false, message: 'Domain not registered' });
    }

    if (!domainStatus.enabled) {
      console.log(`🚫 Tracking blocked: domain ${domain} is disabled`);
      return NextResponse.json({ success: false, message: 'Domain disabled' });
    }

    // Normalize utm_source: convert '(direct)' to 'Direct' for consistency
    // BUT: If tracking_code exists, use immutable attribution from MySQL (not URL params)
    let finalUtmSource: string;
    let finalUtmMedium: string;
    let finalUtmCampaign: string;
    let finalUtmContent: string;
    let finalUtmTerm: string;

    if (tracking_code && tracking_code !== '' && immutableUtmCampaign) {
      // Use immutable attribution captured from MySQL (for accurate historical attribution)
      finalUtmSource = immutableUtmSource || 'Direct';
      finalUtmMedium = immutableUtmMedium || '';
      finalUtmCampaign = immutableUtmCampaign || '';
      finalUtmContent = immutableUtmContent || '';
      finalUtmTerm = immutableUtmTerm || '';
    } else {
      // Direct traffic or no tracking_code: use URL params (legacy behavior)
      finalUtmSource = (utm_source === '(direct)' || utm_source === '') ? 'Direct' : (utm_source || '');
      finalUtmMedium = utm_medium || '';
      finalUtmCampaign = utm_campaign || '';
      finalUtmContent = utm_content || '';
      finalUtmTerm = utm_term || '';
    }

    // Insert into ClickHouse visit_logs table
    // CRITICAL: Store landing_url and all UTM params at event time for immutable attribution
    try {
      const timestampUTC = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const createdDateKST = getCurrentDateKST();

      await insertWithMemoryLimit({
        table: 'analytics.visit_logs',
        values: [{
          timestamp: timestampUTC,
          created_date_kst: createdDateKST,
          session_id: session_id || '',
          user_id: user_id || '',
          page_url: page_url || '',
          page_title: page_title || '',
          referrer: referrer || '',
          referrer_domain: referrer_domain || '',
          tracking_code: tracking_code || '',
          landing_url: landing_url || '', // Immutable: captured from MySQL at event time
          utm_source: finalUtmSource,
          utm_medium: finalUtmMedium,
          utm_campaign: finalUtmCampaign,
          utm_term: finalUtmTerm,
          utm_content: finalUtmContent,
          campaign_id: campaign_id, // Now populated from MySQL lookup
          course_id: course_id, // Now populated from MySQL lookup
          user_agent: user_agent || '',
          device_type: device_type || 'Desktop',
          os: os || 'Unknown',
          browser: browser || 'Unknown',
          screen_resolution: screen_resolution || '',
          visit_count: visit_count || 1,
          is_new_visitor: is_new_visitor || 0,
          time_on_page: time_on_page || 0,
          event_type: event_type || 'pageview',
          conversion_type: conversion_type || '',
          conversion_value: conversion_value || 0,
          conversion_metadata: conversion_metadata || '',
          page_sequence: page_sequence || 0,
          is_exit_page: is_exit_page || 0,
          is_landing_page: data.is_landing_page || 0,
          previous_page_url: data.previous_page_url || '',
          session_page_count: session_page_count || 0,
          http_status: http_status || 200,
        }],
        format: 'JSONEachRow'
      });

      return NextResponse.json({ success: true });
    } catch (error: any) {
      if (isTransientInfraError(error)) {
        console.warn('⚠️ DB/infra transient error; skipping insert', {
          code: error?.code,
          errno: error?.errno,
          sqlState: error?.sqlState
        });
        // During shutdown, return success to avoid blocking user
        return NextResponse.json({ success: true, message: 'Data may not have been recorded due to shutdown' });
      }

      if (isLikelyBugOrSchemaError(error)) {
        console.error('🚨 DB bug/schema error during insert; investigate', {
          code: error?.code,
          errno: error?.errno,
          sqlState: error?.sqlState,
          message: error?.message
        });
        // Still return success to avoid blocking the user, but log loudly
        return NextResponse.json({ success: true, message: 'Data may not have been recorded due to database error' });
      }

      console.error('❗ Unknown error inserting tracking data:', error);
      // Still return success to avoid blocking the user
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('Tracking endpoint error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}

