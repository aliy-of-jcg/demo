import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import clickhouse from "@/lib/clickhouse";
import { parseUserAgent } from "@/lib/user-agent";
import { parseReferrer, getGeoLocation } from "@/lib/url-parser";
import { getPool } from "@/lib/mysql";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const trackingCode = params.code;
    
    console.log("\n" + "=".repeat(50));
    console.log("SHORT URL TRACKING REQUEST");
    console.log("=".repeat(50));
    console.log("Tracking Code:", trackingCode);
    
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
        c.id as campaign_id,
        c.name as campaign_name,
        c.course_id
      FROM utm_codes u
      LEFT JOIN campaigns c ON u.campaign_id = c.id
      WHERE u.tracking_code = ?
      LIMIT 1`,
      [trackingCode]
    );
    
    if (!rows || (rows as any[]).length === 0) {
      console.log("❌ Tracking code not found");
      return NextResponse.json({ error: "Invalid or expired tracking link" }, { status: 404 });
    }

    const trackingData = (rows as any[])[0];
    const targetUrl = trackingData.target_url as string;
    const campaignName = trackingData.campaign_name as string;
    const campaign_id = trackingData.campaign_id || 0;
    const course_id = trackingData.course_id || 0;
    const utmSource = trackingData.utm_source || '';
    const utmMedium = trackingData.utm_medium || '';
    const utmCampaign = trackingData.utm_campaign || '';
    const utmTerm = trackingData.utm_term || '';
    const utmContent = trackingData.utm_content || '';
    
    console.log("✅ Found tracking data:");
    console.log("- Target URL:", targetUrl);
    console.log("- Campaign:", campaignName);
    console.log("- Campaign ID:", campaign_id);
    console.log("- Course ID:", course_id);
    console.log("- UTM Source:", utmSource);
    
    // Build final redirect URL (CLEAN - no UTM parameters visible)
    const finalRedirectUrl = targetUrl;
    console.log("🔗 Redirecting to:", finalRedirectUrl);
    
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
        
        console.log("✅ Click event logged to tracking_events");
        
        // 2. ✨ NEW: Also log a "visit" to visit_logs for course tracking
        // This enables course visit counts even for external landing pages
        if (campaign_id > 0) {
          try {
            // Generate a pseudo user_id based on IP (not as accurate as cookie, but works for external sites)
            const pseudoUserId = `redirect_${ip.replace(/\./g, '_')}`;
            const sessionId = nanoid();
            
            await clickhouse.insert({
              table: "analytics.visit_logs",
              values: [{
                timestamp: Math.floor(Date.now() / 1000),
                session_id: sessionId,
                user_id: pseudoUserId, // Pseudo ID based on IP
                page_url: targetUrl,
                page_title: campaignName || '',
                referrer: referrer || '',
                utm_source: utmSource,
                utm_medium: utmMedium,
                utm_campaign: utmCampaign,
                utm_term: utmTerm,
                utm_content: utmContent,
                campaign_id: campaign_id, // ✅ Populated from MySQL lookup
                course_id: course_id,     // ✅ Populated from MySQL lookup
                user_agent: userAgent,
                device_type: parsedUA.deviceType,
                os: parsedUA.os || '',
                browser: parsedUA.browser || '',
                screen_resolution: '',
                visit_count: 1,
                is_new_visitor: 1, // Assume new since we don't have cookie access
                time_on_page: 0,
                event_type: 'redirect_visit',
                page_sequence: 1,
                is_landing_page: 1,
                is_exit_page: 0,
                previous_page_url: referrer || ''
              }],
              format: "JSONEachRow",
            });
            
            console.log(`✅ Visit logged to visit_logs (campaign_id: ${campaign_id}, course_id: ${course_id})`);
          } catch (visitError) {
            console.warn("⚠️  Failed to log visit to visit_logs:", visitError);
          }
        }
        
      } catch (e) {
        console.error("❌ Failed to log tracking event:", e);
      }
    });
    
    // Redirect immediately (don't wait for database logging)
    return NextResponse.redirect(finalRedirectUrl, 302);
    
  } catch (error) {
    console.error("\n❌ ERROR IN SHORT URL TRACKING:");
    console.error(error);
    
    return NextResponse.json({
      error: "Tracking failed",
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

