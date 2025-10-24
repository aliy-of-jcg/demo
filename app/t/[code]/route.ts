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

    // Look up tracking code in database to get target URL and UTM info
    const query = await clickhouse.query({
      query: `
        SELECT 
          target_url,
          campaign_name,
          description
        FROM analytics.tracking_codes
        WHERE tracking_code = '${trackingCode}' 
        AND is_active = 1
        LIMIT 1
      `,
      format: "JSONEachRow",
    });

    const results = await query.json();
    
    if (!results || results.length === 0) {
      console.log("❌ Tracking code not found or inactive");
      return NextResponse.json({ error: "Invalid or expired tracking link" }, { status: 404 });
    }

    const trackingData = results[0] as any;
    const targetUrl = trackingData.target_url as string;
    const campaignName = trackingData.campaign_name as string;
    
    // Extract UTM params from description (format: "source - medium - campaign")
    const [utmSource, utmMedium, utmCampaign] = trackingData.description?.split(' - ') || ['', '', ''];
    
    console.log("✅ Found tracking data:");
    console.log("- Target URL:", targetUrl);
    console.log("- Campaign:", campaignName);
    console.log("- UTM Source:", utmSource);
    
    // ✨ NEW: Get campaign_id and course_id from MySQL for server-side tracking
    let campaign_id = 0;
    let course_id = 0;
    
    try {
      const pool = getPool();
      
      // Match tracking code to campaign
      const query = `
        SELECT c.id as campaign_id, c.course_id, c.name as campaign_name
        FROM utm_codes u
        INNER JOIN campaigns c ON u.campaign_id = c.id
        WHERE u.tracking_code = ?
        LIMIT 1
      `;
      
      const [rows] = await pool.execute(query, [trackingCode]);
      
      if ((rows as any[]).length > 0) {
        const match = (rows as any[])[0];
        campaign_id = match.campaign_id;
        course_id = match.course_id || 0;
        console.log(`✅ Linked to campaign_id: ${campaign_id}, course_id: ${course_id}`);
      }
    } catch (mysqlError) {
      console.warn('⚠️  Failed to lookup campaign:', mysqlError);
    }
    
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
            utm_source: utmSource || '',
            utm_medium: utmMedium || '',
            utm_campaign: utmCampaign || '',
            utm_content: '',
            utm_term: '',
            
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
                utm_source: utmSource || '',
                utm_medium: utmMedium || '',
                utm_campaign: utmCampaign || '',
                utm_term: '',
                utm_content: '',
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

