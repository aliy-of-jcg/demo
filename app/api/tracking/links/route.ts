import { NextRequest, NextResponse } from "next/server";
import clickhouse from "@/lib/clickhouse";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");

    const query = await clickhouse.query({
      query: `
        SELECT
          id,
          tracking_code,
          campaign_name,
          target_url,
          description,
          created_by,
          created_at,
          is_active
        FROM analytics.tracking_codes
        WHERE is_active = 1
        ORDER BY created_at DESC
        LIMIT ${limit}
      `,
      format: "JSONEachRow",
    });

    const links = await query.json();

    // Transform to match frontend interface
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    const transformedLinks = links.map((link: any) => {
      // Extract UTM params from description (format: "source - medium - campaign")
      const [utmSource, utmMedium, utmCampaign] = link.description?.split(' - ') || ['', '', ''];
      
      // Reconstruct tracking URL
      const trackingUrl = new URL(`${appUrl}/track`);
      trackingUrl.searchParams.set("code", link.tracking_code);
      trackingUrl.searchParams.set("utm_source", utmSource);
      trackingUrl.searchParams.set("utm_medium", utmMedium);
      trackingUrl.searchParams.set("utm_campaign", utmCampaign);
      
      const base64Url = Buffer.from(link.target_url).toString('base64');
      trackingUrl.searchParams.set("r", base64Url);

      return {
        id: link.id,
        campaignName: link.campaign_name,
        trackingCode: link.tracking_code,
        targetUrl: link.target_url,
        utmSource,
        utmMedium,
        utmCampaign,
        fullUrl: trackingUrl.toString(),
        createdAt: link.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      links: transformedLinks,
      count: transformedLinks.length,
    });
  } catch (error) {
    console.error("Error fetching tracking links:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch tracking links",
        links: [],
        count: 0,
      },
      { status: 500 }
    );
  }
}

