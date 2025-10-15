import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import clickhouse from "@/lib/clickhouse";
import { parseUserAgent } from "@/lib/user-agent";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const rawUrl = request.url;
    console.log("\n" + "=".repeat(50));
    console.log("TRACKING REQUEST RECEIVED");
    console.log("=".repeat(50));
    console.log("Raw URL:", rawUrl);
    
    const searchParams = request.nextUrl.searchParams;
    const trackingCode = searchParams.get("code");
    const base64Redirect = searchParams.get("r");
    const urlEncodedRedirect = searchParams.get("redirect");
    const utmSource = searchParams.get("utm_source") || "";
    const utmMedium = searchParams.get("utm_medium") || "";
    const utmCampaign = searchParams.get("utm_campaign") || "";
    const utmContent = searchParams.get("utm_content") || "";
    const utmTerm = searchParams.get("utm_term") || "";

    console.log("\nParsed Parameters:");
    console.log("- Code:", trackingCode);
    console.log("- Base64 redirect (r):", base64Redirect);
    console.log("- URL-encoded redirect:", urlEncodedRedirect);
    console.log("- UTM Source:", utmSource);

    if (!trackingCode || (!base64Redirect && !urlEncodedRedirect)) {
      console.log("❌ Missing required parameters");
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Support both base64 (for messaging apps) and URL-encoded (for HTML links/ads)
    let finalRedirectUrl: string;
    
    if (base64Redirect) {
      // Base64 approach - for messaging apps
      try {
        finalRedirectUrl = Buffer.from(base64Redirect, 'base64').toString('utf-8');
        console.log("- Decoded from base64:", finalRedirectUrl);
      } catch (error) {
        console.error("❌ Failed to decode base64");
        return NextResponse.json({ error: "Invalid redirect parameter" }, { status: 400 });
      }
    } else if (urlEncodedRedirect) {
      // URL-encoded approach - for HTML links, ads, emails
      finalRedirectUrl = urlEncodedRedirect;
      console.log("- Using URL-encoded redirect:", finalRedirectUrl);
    } else {
      return NextResponse.json({ error: "No redirect parameter provided" }, { status: 400 });
    }
    
    console.log("\nBuilding Final URL:");
    console.log("- Starting with:", finalRedirectUrl);
    
    const urlObj = new URL(finalRedirectUrl);
    console.log("- Successfully parsed as URL");
    console.log("- Protocol:", urlObj.protocol);
    console.log("- Host:", urlObj.host);
    console.log("- Pathname:", urlObj.pathname);
    
    if (utmSource) urlObj.searchParams.append("utm_source", utmSource);
    if (utmMedium) urlObj.searchParams.append("utm_medium", utmMedium);
    if (utmCampaign) urlObj.searchParams.append("utm_campaign", utmCampaign);
    if (utmContent) urlObj.searchParams.append("utm_content", utmContent);
    if (utmTerm) urlObj.searchParams.append("utm_term", utmTerm);
    
    finalRedirectUrl = urlObj.toString();
    console.log("- Final URL with UTM:", finalRedirectUrl);
    console.log("\n🔗 REDIRECTING NOW...\n");
    
    setImmediate(async () => {
      try {
        const userAgent = request.headers.get("user-agent") || "";
        const referrer = request.headers.get("referer") || "";
        const ip = request.headers.get("x-forwarded-for") || "unknown";
        const { deviceType, browser, os } = parseUserAgent(userAgent);
        
        await clickhouse.insert({
          table: "analytics.tracking_events",
          values: [{
            id: nanoid(),
            tracking_code: trackingCode,
            campaign_name: utmCampaign || "Unknown",
            utm_source: utmSource,
            utm_medium: utmMedium,
            utm_campaign: utmCampaign,
            utm_content: utmContent,
            utm_term: utmTerm,
            referrer,
            ip_address: ip,
            user_agent: userAgent,
            device_type: deviceType,
            browser,
            os,
            country: "Unknown",
            city: "Unknown",
          }],
          format: "JSONEachRow",
        });
      } catch (e) {
        // Silently fail if ClickHouse is not available
      }
    });
    
    return NextResponse.redirect(finalRedirectUrl, 302);
    
  } catch (error) {
    console.error("\n❌ ERROR IN TRACKING:");
    console.error(error);
    
    // Try fallback redirect
    const base64Redirect = request.nextUrl.searchParams.get("r");
    const urlEncodedRedirect = request.nextUrl.searchParams.get("redirect");
    
    if (base64Redirect) {
      try {
        const fallbackUrl = Buffer.from(base64Redirect, 'base64').toString('utf-8');
        console.log("Attempting fallback redirect (base64) to:", fallbackUrl);
        return NextResponse.redirect(fallbackUrl, 302);
      } catch (e) {
        console.error("Fallback base64 decode failed:", e);
      }
    }
    
    if (urlEncodedRedirect) {
      console.log("Attempting fallback redirect (URL-encoded) to:", urlEncodedRedirect);
      return NextResponse.redirect(urlEncodedRedirect, 302);
    }
    
    return NextResponse.json({
      error: "Tracking failed",
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

