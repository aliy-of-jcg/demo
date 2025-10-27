import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getPool } from "@/lib/mysql";
import { encrypt } from "@/lib/encryption";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      campaignName,
      campaignId, // Optional: Link to specific campaign
      targetUrl,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
    } = body;

    if (!campaignName || !targetUrl || !utmSource || !utmMedium || !utmCampaign) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const trackingCode = nanoid(10);
    const id = nanoid();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    // Create clean short URL: /t/<code>
    // All data is stored in database and looked up by code
    // No sensitive information exposed in URL
    const trackingUrl = `${appUrl}/t/${trackingCode}`;
    
    // Build full URL with UTM parameters for reference
    const urlObj = new URL(targetUrl);
    urlObj.searchParams.set('utm_source', utmSource);
    urlObj.searchParams.set('utm_medium', utmMedium);
    urlObj.searchParams.set('utm_campaign', utmCampaign);
    if (utmContent) urlObj.searchParams.set('utm_content', utmContent);
    if (utmTerm) urlObj.searchParams.set('utm_term', utmTerm);
    const fullUrlWithUtm = urlObj.toString();

    try {
      // Store in MySQL utm_codes table for campaign management
      const pool = getPool();
      
      // Generate a descriptive name for the tracking link (only source, not medium)
      const linkName = utmSource.charAt(0).toUpperCase() + utmSource.slice(1);
      
      await pool.execute(
        `INSERT INTO utm_codes 
         (name, campaign_id, tracking_code, utm_campaign, utm_source, utm_medium, utm_term, utm_content, landing_url, full_url, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [
          linkName,
          campaignId || null,
          trackingCode,
          utmCampaign,
          utmSource,
          utmMedium,
          utmTerm || '',
          utmContent || '',
          targetUrl,
          fullUrlWithUtm
        ]
      );
    } catch (error) {
      console.warn("MySQL utm_codes insert failed:", error);
    }

    return NextResponse.json({
      success: true,
      trackingLink: {
        id,
        campaignName,
        trackingCode,
        targetUrl,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent: utmContent || '',
        utmTerm: utmTerm || '',
        fullUrl: trackingUrl,
        fullUrlWithUtm,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error generating tracking link:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate tracking link" },
      { status: 500 }
    );
  }
}

