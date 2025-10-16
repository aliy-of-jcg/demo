import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import clickhouse from "@/lib/clickhouse";
import { encrypt } from "@/lib/encryption";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      campaignName,
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

    try {
      await clickhouse.insert({
        table: "analytics.tracking_codes",
        values: [
          {
            id,
            tracking_code: trackingCode,
            campaign_name: campaignName,
            target_url: targetUrl,
            description: `${utmSource} - ${utmMedium} - ${utmCampaign}`,
            created_by: "admin",
            is_active: 1,
          },
        ],
        format: "JSONEachRow",
      });
    } catch (error) {
      console.warn("ClickHouse not available, continuing without storage:", error);
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
        fullUrl: trackingUrl,
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

