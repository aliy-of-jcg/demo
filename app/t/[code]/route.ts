import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import clickhouse from "@/lib/clickhouse";
import { parseUserAgent } from "@/lib/user-agent";
import { parseReferrer, getGeoLocation } from "@/lib/url-parser";

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
    
    // Check if UTM parameters should be appended (query parameter)
    const appendUtm = request.nextUrl.searchParams.get("utm") === "true";
    
    // Build final redirect URL
    let finalRedirectUrl = targetUrl;
    
    if (appendUtm && utmSource && utmMedium && utmCampaign) {
      // Only append UTM if explicitly requested
      const urlObj = new URL(targetUrl);
      urlObj.searchParams.set("utm_source", utmSource);
      urlObj.searchParams.set("utm_medium", utmMedium);
      urlObj.searchParams.set("utm_campaign", utmCampaign);
      finalRedirectUrl = urlObj.toString();
      console.log("✅ UTM parameters appended to URL");
    } else {
      console.log("✅ Clean URL (no UTM parameters)");
    }
    
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
        
        console.log("✅ Tracking event logged successfully");
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

