import { NextRequest, NextResponse } from 'next/server';
import clickhouse from '@/lib/clickhouse';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Build WHERE clause for date filtering
    let whereClause = '1=1';

    if (startDate) {
      whereClause += ` AND toDate(timestamp) >= '${startDate}'`;
    }
    if (endDate) {
      whereClause += ` AND toDate(timestamp) <= '${endDate}'`;
    }

    // 1. Landing Pages (first page of session)
    const landingPagesQuery = `
      SELECT 
        page_url,
        COUNT(DISTINCT session_id) as sessions,
        COUNT(DISTINCT user_id) as visitors,
        countIf(event_type = 'conversion') as conversions,
        AVG(time_on_page) as avg_time_on_page
      FROM visit_logs
      WHERE ${whereClause}
        AND is_landing_page = 1
      GROUP BY page_url
      ORDER BY sessions DESC
      LIMIT 20
    `;

    const landingPagesResult = await clickhouse.query({
      query: landingPagesQuery,
      format: 'JSONEachRow',
    });

    const landingPagesJson = await landingPagesResult.json();
    const landingPages = landingPagesJson.map((row: any) => ({
      page: row.page_url,
      sessions: row.sessions || 0,
      visitors: row.visitors || 0,
      conversions: row.conversions || 0,
      conversionRate: row.sessions > 0 
        ? ((row.conversions / row.sessions) * 100).toFixed(2) 
        : '0.00',
      avgTimeOnPage: Math.round(row.avg_time_on_page || 0),
      bounceRate: '0.00',
    }));

    // 2. Exit Pages (last page of session or exit event)
    const exitPagesQuery = `
      SELECT 
        page_url,
        COUNT(DISTINCT session_id) as sessions,
        COUNT(DISTINCT user_id) as visitors,
        AVG(time_on_page) as avg_time_on_page
      FROM visit_logs
      WHERE ${whereClause}
        AND (is_exit_page = 1 OR event_type = 'page_exit')
      GROUP BY page_url
      ORDER BY sessions DESC
      LIMIT 20
    `;

    const exitPagesResult = await clickhouse.query({
      query: exitPagesQuery,
      format: 'JSONEachRow',
    });

    const exitPagesJson = await exitPagesResult.json();
    const exitPages = exitPagesJson.map((row: any) => ({
      page: row.page_url,
      sessions: row.sessions || 0,
      visitors: row.visitors || 0,
      avgTimeOnPage: Math.round(row.avg_time_on_page || 0),
      exitRate: '0.00',
    }));

    // 3. Page Navigation Patterns (most common page sequences)
    const navigationPatternsQuery = `
      SELECT 
        previous_page_url,
        page_url as current_page,
        COUNT(*) as transitions,
        COUNT(DISTINCT user_id) as unique_users
      FROM visit_logs
      WHERE ${whereClause}
        AND previous_page_url != ''
        AND page_sequence > 1
      GROUP BY previous_page_url, current_page
      ORDER BY transitions DESC
      LIMIT 30
    `;

    const navigationPatternsResult = await clickhouse.query({
      query: navigationPatternsQuery,
      format: 'JSONEachRow',
    });

    const navigationPatternsJson = await navigationPatternsResult.json();
    const navigationPatterns = navigationPatternsJson.map((row: any) => ({
      from: row.previous_page_url,
      to: row.current_page,
      transitions: row.transitions || 0,
      uniqueUsers: row.unique_users || 0,
    }));

    // 4. Popular Pages (most viewed)
    const popularPagesQuery = `
      SELECT 
        page_url,
        COUNT(*) as pageviews,
        COUNT(DISTINCT user_id) as unique_visitors,
        AVG(time_on_page) as avg_time_on_page
      FROM visit_logs
      WHERE ${whereClause}
      GROUP BY page_url
      ORDER BY pageviews DESC
      LIMIT 20
    `;

    const popularPagesResult = await clickhouse.query({
      query: popularPagesQuery,
      format: 'JSONEachRow',
    });

    const popularPagesJson = await popularPagesResult.json();
    const popularPages = popularPagesJson.map((row: any) => ({
      page: row.page_url,
      pageviews: row.pageviews || 0,
      uniqueVisitors: row.unique_visitors || 0,
      avgTimeOnPage: Math.round(row.avg_time_on_page || 0),
    }));

    // 5. Average session depth (pages per session)
    const sessionDepthQuery = `
      SELECT 
        session_id,
        MAX(page_sequence) as max_sequence
      FROM visit_logs
      WHERE ${whereClause}
      GROUP BY session_id
    `;

    const sessionDepthResult = await clickhouse.query({
      query: sessionDepthQuery,
      format: 'JSONEachRow',
    });

    const sessionDepthJson = await sessionDepthResult.json();
    
    const sessionDepths = sessionDepthJson.map((row: any) => row.max_sequence || 1);
    const avgSessionDepth = sessionDepths.length > 0 
      ? (sessionDepths.reduce((sum: number, depth: number) => sum + depth, 0) / sessionDepths.length).toFixed(2)
      : '0.00';

    // Calculate bounce rate (sessions with only 1 page)
    const singlePageSessions = sessionDepths.filter((depth: number) => depth === 1).length;
    const totalSessions = sessionDepths.length;
    const overallBounceRate = totalSessions > 0 
      ? ((singlePageSessions / totalSessions) * 100).toFixed(2)
      : '0.00';

    // 6. Page depth distribution
    const depthDistribution = [
      { depth: '1 page', count: sessionDepths.filter((d: number) => d === 1).length },
      { depth: '2-3 pages', count: sessionDepths.filter((d: number) => d >= 2 && d <= 3).length },
      { depth: '4-5 pages', count: sessionDepths.filter((d: number) => d >= 4 && d <= 5).length },
      { depth: '6-10 pages', count: sessionDepths.filter((d: number) => d >= 6 && d <= 10).length },
      { depth: '11+ pages', count: sessionDepths.filter((d: number) => d > 10).length },
    ];

    return NextResponse.json({
      success: true,
      landingPages,
      exitPages,
      navigationPatterns,
      popularPages,
      insights: {
        avgSessionDepth,
        overallBounceRate,
        totalSessions,
        depthDistribution,
      },
    });

  } catch (error) {
    console.error('Page flow analysis API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
