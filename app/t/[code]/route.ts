import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import clickhouse from "@/lib/clickhouse";
import { parseUserAgent } from "@/lib/user-agent";
import { parseReferrer, getGeoLocation } from "@/lib/url-parser";
import { getPool } from "@/lib/mysql";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const params = await context.params;
    const trackingCode = params.code;
    
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

    // Check if UTM is inactive
    if (utmStatus === 'inactive' || utmStatus === 'ended') {
      const baseUrl = new URL(request.url).origin;
      const expiredUrl = new URL(`${baseUrl}/link-expired`);
      expiredUrl.searchParams.set('reason', 'inactive');
      if (campaignName) {
        expiredUrl.searchParams.set('campaign', campaignName);
      }
      return NextResponse.redirect(expiredUrl.toString(), 302);
    }

    // Check if campaign is inactive/ended
    if (campaignStatus === 'ended') {
      const baseUrl = new URL(request.url).origin;
      const expiredUrl = new URL(`${baseUrl}/link-expired`);
      expiredUrl.searchParams.set('reason', 'campaign_ended');
      if (campaignName) {
        expiredUrl.searchParams.set('campaign', campaignName);
      }
      return NextResponse.redirect(expiredUrl.toString(), 302);
    }

    if (campaignStatus === 'paused') {
      const baseUrl = new URL(request.url).origin;
      const expiredUrl = new URL(`${baseUrl}/link-expired`);
      expiredUrl.searchParams.set('reason', 'campaign_paused');
      if (campaignName) {
        expiredUrl.searchParams.set('campaign', campaignName);
      }
      return NextResponse.redirect(expiredUrl.toString(), 302);
    }

    const targetUrl = trackingData.target_url as string;
    const campaign_id = trackingData.campaign_id || 0;
    const course_id = trackingData.course_id || 0;
    const utmSource = trackingData.utm_source || '';
    const utmMedium = trackingData.utm_medium || '';
    const utmCampaign = trackingData.utm_campaign || '';
    const utmTerm = trackingData.utm_term || '';
    const utmContent = trackingData.utm_content || '';
    
    // Build final redirect URL with UTM parameters
    // These are needed by the client-side tracking script to link the visit to the campaign
    const redirectUrl = new URL(targetUrl);
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
        await clickhouse.insert({
          table: "analytics.tracking_events",
          values: [{
            id: nanoid(),
            tracking_code: trackingCode,
            campaign_name: campaignName || "Unknown",
            
            // UTM Parameters
            utm_source: utmSource,
            utm_medium: utmMedium,
            utm_campaign: utmCampaign,
            utm_content: utmContent,
            utm_term: utmTerm,
            
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
    return NextResponse.redirect(finalRedirectUrl, 302);
    
  } catch (error) {
    return NextResponse.json({
      error: "Tracking failed",
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

