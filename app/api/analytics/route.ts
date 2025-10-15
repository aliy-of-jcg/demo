import { NextRequest, NextResponse } from "next/server";
import clickhouse from "@/lib/clickhouse";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "7");

    const statsQuery = await clickhouse.query({
      query: `
        SELECT
          count() as total_clicks,
          uniq(ip_address) as unique_visitors,
          countDistinct(campaign_name) as active_campaigns
        FROM analytics.tracking_events
        WHERE timestamp >= now() - INTERVAL ${days} DAY
      `,
      format: "JSONEachRow",
    });

    const clicksQuery = await clickhouse.query({
      query: `
        SELECT
          toDate(timestamp) as date,
          count() as clicks,
          uniq(ip_address) as conversions
        FROM analytics.tracking_events
        WHERE timestamp >= now() - INTERVAL ${days} DAY
        GROUP BY date
        ORDER BY date
      `,
      format: "JSONEachRow",
    });

    const platformQuery = await clickhouse.query({
      query: `
        SELECT
          utm_source as name,
          count() as value
        FROM analytics.tracking_events
        WHERE timestamp >= now() - INTERVAL ${days} DAY
        GROUP BY utm_source
        ORDER BY value DESC
      `,
      format: "JSONEachRow",
    });

    const deviceQuery = await clickhouse.query({
      query: `
        SELECT
          device_type as device,
          count() as visits
        FROM analytics.tracking_events
        WHERE timestamp >= now() - INTERVAL ${days} DAY
        GROUP BY device_type
        ORDER BY visits DESC
      `,
      format: "JSONEachRow",
    });

    const campaignsQuery = await clickhouse.query({
      query: `
        SELECT
          campaign_name as name,
          count() as clicks,
          concat(toString(round((count() * 100.0) / (SELECT count() FROM analytics.tracking_events WHERE timestamp >= now() - INTERVAL ${days} DAY), 1)), '%') as ctr
        FROM analytics.tracking_events
        WHERE timestamp >= now() - INTERVAL ${days} DAY
        GROUP BY campaign_name
        ORDER BY clicks DESC
        LIMIT 4
      `,
      format: "JSONEachRow",
    });

    const stats = await statsQuery.json();
    const clicks = await clicksQuery.json();
    const platforms = await platformQuery.json();
    const devices = await deviceQuery.json();
    const campaigns = await campaignsQuery.json();

    const platformColors: { [key: string]: string } = {
      'kakao': '#FEE500',
      'naver': '#03C75A',
      'google': '#4285F4',
      'telegram': '#0088cc',
      'tg': '#0088cc',
      'facebook': '#1877F2',
      'instagram': '#E4405F',
      'direct': '#9CA3AF',
    };

    const platformsWithColors = platforms.map((p: any) => ({
      ...p,
      color: platformColors[p.name?.toLowerCase()] || '#6B7280',
    }));

    return NextResponse.json({
      success: true,
      data: {
        stats: stats[0] || { total_clicks: 0, unique_visitors: 0, active_campaigns: 0 },
        clicks,
        platforms: platformsWithColors,
        devices,
        campaigns,
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    
    return NextResponse.json({
      success: false,
      error: "Failed to fetch analytics data",
      message: "ClickHouse may not be configured. Using static demo data.",
      data: {
        stats: { total_clicks: 0, unique_visitors: 0, active_campaigns: 0 },
        clicks: [],
        platforms: [
          { name: "telegram", value: 1, color: "#0088cc" },
          { name: "kakao", value: 1, color: "#FEE500" },
          { name: "naver", value: 1, color: "#03C75A" },
          { name: "google", value: 1, color: "#4285F4" },
        ],
        devices: [],
        campaigns: [],
      },
    });
  }
}

