import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import clickhouse, { insertWithMemoryLimit } from "@/lib/clickhouse";
import { parseUserAgent } from "@/lib/user-agent";
import { parseReferrer, getGeoLocation } from "@/lib/url-parser";
import { getPool } from "@/lib/mysql";

export const dynamic = 'force-dynamic';

// Helper function to get the correct base URL from request headers
function getBaseUrl(request: NextRequest): string {
  // Try to get the host from forwarded headers (for proxy/load balancer scenarios)
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'http';
  
  if (forwardedHost) {
    // Use forwarded headers if available
    return `${forwardedProto}://${forwardedHost}`;
  }
  
  // Fallback to Host header
  const host = request.headers.get('host');
  if (host) {
    // Check if protocol is specified in Host header, otherwise use https if port is 443, http otherwise
    const protocol = request.headers.get('x-forwarded-proto') || 
                     (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https');
    return `${protocol}://${host}`;
  }
  
  // Last resort: use environment variable or construct from request URL
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) {
    return envUrl;
  }
  
  // Parse from request URL but be careful with 0.0.0.0
  try {
    const url = new URL(request.url);
    // If hostname is 0.0.0.0 or localhost-like, try to get from Host header
    if (url.hostname === '0.0.0.0' || url.hostname === '127.0.0.1') {
      const hostHeader = request.headers.get('host');
      if (hostHeader) {
        return `${url.protocol}//${hostHeader}`;
      }
    }
    return url.origin;
  } catch {
    // Final fallback
    return 'http://localhost:3000';
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const params = await context.params;
    const trackingCode = params.code;
    
    console.log(`🔗 Tracking Redirect API - Code: ${trackingCode}`);
    
    if (!trackingCode) {
      return NextResponse.json({ error: "Missing tracking code" }, { status: 400 });
    }

    // Look up tracking code in MySQL database
    const pool = getPool();
    
    const [rows] = await pool.execute(
      `SELECT 
        u.tracking_code,
        u.landing_url as target_url,
        u.utm_source,
        u.utm_medium,
        u.utm_campaign,
        u.utm_term,
        u.utm_content,
        u.status as utm_status,
        c.id as campaign_id,
        c.name as campaign_name,
        c.course_id,
        c.status as campaign_status
      FROM utm_codes u
      LEFT JOIN campaigns c ON u.campaign_id = c.id
      WHERE u.tracking_code = ?
      LIMIT 1`,
      [trackingCode]
    );
    
    if (!rows || (rows as any[]).length === 0) {
      return NextResponse.json({ error: "Invalid or expired tracking link" }, { status: 404 });
    }

    const trackingData = (rows as any[])[0];
    const utmStatus = trackingData.utm_status;
    const campaignStatus = trackingData.campaign_status;
    const campaignName = trackingData.campaign_name as string;

    // Get the correct base URL
    const baseUrl = getBaseUrl(request);

    // Helper to create redirect response with no-cache headers
    const createRedirect = (url: string) => {
      const response = NextResponse.redirect(url, 302);
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    };

    // Check if UTM is hidden (soft deleted)
    if (utmStatus === 'hidden') {
      const expiredUrl = new URL(`${baseUrl}/link-expired`);
      expiredUrl.searchParams.set('reason', 'deleted');
      if (campaignName) {
        expiredUrl.searchParams.set('campaign', campaignName);
      }
      return createRedirect(expiredUrl.toString());
    }

    // Check if UTM is inactive
    if (utmStatus === 'inactive' || utmStatus === 'ended') {
      const expiredUrl = new URL(`${baseUrl}/link-expired`);
      expiredUrl.searchParams.set('reason', 'inactive');
      if (campaignName) {
        expiredUrl.searchParams.set('campaign', campaignName);
      }
      return createRedirect(expiredUrl.toString());
    }

    // Check if campaign is inactive/ended
    if (campaignStatus === 'ended') {
      const expiredUrl = new URL(`${baseUrl}/link-expired`);
      expiredUrl.searchParams.set('reason', 'campaign_ended');
      if (campaignName) {
        expiredUrl.searchParams.set('campaign', campaignName);
      }
      return createRedirect(expiredUrl.toString());
    }

    if (campaignStatus === 'paused') {
      const expiredUrl = new URL(`${baseUrl}/link-expired`);
      expiredUrl.searchParams.set('reason', 'campaign_paused');
      if (campaignName) {
        expiredUrl.searchParams.set('campaign', campaignName);
      }
      return createRedirect(expiredUrl.toString());
    }

    const targetUrl = trackingData.target_url as string;
    
    // Validate target URL exists
    if (!targetUrl || targetUrl.trim() === '') {
      const expiredUrl = new URL(`${baseUrl}/link-expired`);
      expiredUrl.searchParams.set('reason', 'inactive');
      if (campaignName) {
        expiredUrl.searchParams.set('campaign', campaignName);
      }
      return createRedirect(expiredUrl.toString());
    }
    
    const campaign_id = trackingData.campaign_id || 0;
    const course_id = trackingData.course_id || 0;
    const utmSource = trackingData.utm_source || '';
    const utmMedium = trackingData.utm_medium || '';
    const utmCampaign = trackingData.utm_campaign || '';
    const utmTerm = trackingData.utm_term || '';
    const utmContent = trackingData.utm_content || '';
    
    // Build final redirect URL with UTM parameters AND tracking_code
    // These are needed by the client-side tracking script to link the visit to the campaign
    let redirectUrl: URL;
    try {
      redirectUrl = new URL(targetUrl);
    } catch (error) {
      // If targetUrl is not a valid URL, return error
      return NextResponse.json({ 
        error: "Invalid target URL", 
        message: "The landing URL is not valid" 
      }, { status: 500 });
    }
    // CRITICAL: Pass tracking_code as URL parameter for reliable CTR tracking
    // Use both _tc (short form for tracker.js) and tracking_code (explicit form)
    redirectUrl.searchParams.set('_tc', trackingCode);
    redirectUrl.searchParams.set('tracking_code', trackingCode);
    if (utmCampaign) redirectUrl.searchParams.set('utm_campaign', utmCampaign);
    if (utmSource) redirectUrl.searchParams.set('utm_source', utmSource);
    if (utmMedium) redirectUrl.searchParams.set('utm_medium', utmMedium);
    if (utmTerm) redirectUrl.searchParams.set('utm_term', utmTerm);
    if (utmContent) redirectUrl.searchParams.set('utm_content', utmContent);
    
    const finalRedirectUrl = redirectUrl.toString();
    
    // Log tracking event asynchronously (don't block redirect)
    setImmediate(async () => {
      try {
        const userAgent = request.headers.get("user-agent") || "";
        const referrer = request.headers.get("referer") || "";
        const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
        
        // Enhanced parsing
        const parsedUA = parseUserAgent(userAgent);
        const parsedReferrer = parseReferrer(referrer);
        const geoLocation = getGeoLocation(ip);
        
        // 1. Log click event to tracking_events
        // CRITICAL: Capture landing_url at click time for immutable attribution
        await insertWithMemoryLimit({
          table: "analytics.tracking_events",
          values: [{
            id: nanoid(),
            tracking_code: trackingCode,
            landing_url: targetUrl, // Immutable: captured at click time
            campaign_name: campaignName || "Unknown",
            
            // UTM Parameters (immutable at click time)
            utm_source: utmSource || '',
            utm_medium: utmMedium || '',
            utm_campaign: utmCampaign || '',
            utm_content: utmContent || '',
            utm_term: utmTerm || '',
            
            // Referrer Data
            referrer,
            referrer_domain: parsedReferrer.domain,
            referrer_source: parsedReferrer.source,
            referrer_is_known: parsedReferrer.isKnownPlatform ? 1 : 0,
            
            // User Data
            ip_address: ip,
            user_agent: userAgent,
            
            // Device Info (Enhanced)
            device_type: parsedUA.deviceType,
            device_vendor: parsedUA.deviceVendor,
            device_model: parsedUA.deviceModel,
            
            // Browser Info (Enhanced)
            browser: parsedUA.browser,
            browser_version: parsedUA.browserVersion,
            
            // OS Info (Enhanced)
            os: parsedUA.os,
            os_version: parsedUA.osVersion,
            
            // Engine
            engine: parsedUA.engine,
            
            // App Detection
            is_mobile_app: parsedUA.isMobileApp ? 1 : 0,
            app_name: parsedUA.appName || '',
            is_bot: parsedUA.isBot ? 1 : 0,
            
            // Location
            country: geoLocation.country,
            city: geoLocation.city,
            region: geoLocation.region || '',
            timezone: geoLocation.timezone || '',
          }],
          format: "JSONEachRow",
        });
        
        // Note: We no longer insert into visit_logs here (with pseudo user_id)
        // The client-side tracking script will handle visit_logs insertion
        // with the real UUID cookie after redirect, ensuring accurate unique visitor tracking
        
      } catch (e) {
        // Silently fail - don't log to console
      }
    });
    
    // Redirect immediately (don't wait for database logging)
    // Use helper to ensure no caching
    return createRedirect(finalRedirectUrl);
    
  } catch (error) {
    return NextResponse.json({
      error: "Tracking failed",
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

