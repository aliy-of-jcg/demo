import { NextRequest, NextResponse } from 'next/server';
import clickhouse from '@/lib/clickhouse';

export const dynamic = 'force-dynamic';

interface WebsiteData {
  domain: string;
  total_sessions: number;
  unique_visitors: number;
  total_pageviews: number;
  total_conversions: number;
  first_seen: string;
  last_seen: string;
  is_active: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Get date range from query parameters (default: last 90 days)
    const endDate = searchParams.get('end') || new Date().toISOString().split('T')[0];
    const startDate = searchParams.get('start') || (() => {
      const date = new Date();
      date.setDate(date.getDate() - 90);
      return date.toISOString().split('T')[0];
    })();

    console.log(`📊 Tracked Websites Analysis - Date Range: ${startDate} to ${endDate}`);

    // Query to extract domains from page_url and aggregate metrics
    // Normalize domains: remove www. prefix, convert to lowercase, ignore protocol/port
    const query = `
      SELECT 
        normalized_domain as domain,
        COUNT(DISTINCT session_id) as total_sessions,
        COUNT(DISTINCT user_id) as unique_visitors,
        SUM(CASE WHEN event_type = 'pageview' THEN 1 ELSE 0 END) as total_pageviews,
        SUM(CASE WHEN event_type = 'conversion' THEN 1 ELSE 0 END) as total_conversions,
        MIN(timestamp) as first_seen,
        MAX(timestamp) as last_seen,
        -- Consider active if last seen within 7 days
        CASE WHEN MAX(timestamp) >= now() - INTERVAL 7 DAY THEN 1 ELSE 0 END as is_active
      FROM (
        SELECT 
          -- Normalize domain: remove www. prefix and convert to lowercase
          lower(if(startsWith(domain(page_url), 'www.'), 
            substring(domain(page_url), 5), 
            domain(page_url))) as normalized_domain,
          session_id,
          user_id,
          event_type,
          timestamp
        FROM analytics.visit_logs
        WHERE toDate(timestamp) BETWEEN toDate('${startDate}') AND toDate('${endDate}')
          AND page_url != ''
          AND page_url IS NOT NULL
          AND domain(page_url) != ''
      )
      GROUP BY normalized_domain
      HAVING normalized_domain NOT IN (
        'dev.cosmosai.co.kr',
        'cosmosai.co.kr',
        'localhost',
        '127.0.0.1',
        '0.0.0.0'
      )
      ORDER BY total_sessions DESC
    `;

    const result = await clickhouse.query({
      query,
      format: 'JSONEachRow'
    });

    const websites = await result.json() as WebsiteData[];

    // Calculate summary stats
    const summary = {
      total_websites: websites.length,
      active_websites: websites.filter(w => w.is_active).length,
      total_sessions: websites.reduce((sum, w) => sum + parseInt(w.total_sessions.toString()), 0),
      total_visitors: websites.reduce((sum, w) => sum + parseInt(w.unique_visitors.toString()), 0),
      total_pageviews: websites.reduce((sum, w) => sum + parseInt(w.total_pageviews.toString()), 0),
      total_conversions: websites.reduce((sum, w) => sum + parseInt(w.total_conversions.toString()), 0),
    };

    console.log(`✅ Found ${websites.length} tracked websites (${summary.active_websites} active)`);

    return NextResponse.json({
      success: true,
      dateRange: { start: startDate, end: endDate },
      websites: websites,
      summary: summary
    });

  } catch (error) {
    console.error('❌ Tracked Websites Analysis API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tracked websites data',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

