import { NextRequest, NextResponse } from 'next/server';
import clickhouse from '@/lib/clickhouse';
import { requirePermission } from '@/lib/auth/api-middleware';
import type { AuthContext } from '@/lib/auth/types';
import { getDefaultTimezone } from '@/lib/system-settings';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('analytics:read', async (request: NextRequest, context: AuthContext) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get timezone from system settings (GA behavior: use system default)
    const timezone = await getDefaultTimezone();

    console.log(`🛤️ Session Journeys API - Fetching up to ${limit} sessions, Timezone: ${timezone}`);

    // Build WHERE clause for date filtering (using system default timezone)
    let whereClause = '1=1';

    if (startDate) {
      whereClause += ` AND toDate(toTimeZone(timestamp, '${timezone}')) >= '${startDate}'`;
    }
    if (endDate) {
      whereClause += ` AND toDate(toTimeZone(timestamp, '${timezone}')) <= '${endDate}'`;
    }

    // Fetch all sessions with their complete page journeys
    // GA-aligned session duration: time from first pageview to last pageview (excluding exit page time)
    const sessionsQuery = `
      WITH session_list AS (
        SELECT DISTINCT
          session_id,
          user_id,
          toString(MIN(timestamp)) as session_start,
          toString(MAX(timestamp)) as session_end,
          COUNT(*) as total_pages,
          -- GA Logic: Session duration = time from first pageview to last pageview (excluding exit page time)
          -- Only count pageview events, not page_exit events
          toUnixTimestamp(MAX(CASE WHEN event_type = 'pageview' THEN timestamp ELSE NULL END)) - 
          toUnixTimestamp(MIN(CASE WHEN event_type = 'pageview' THEN timestamp ELSE NULL END)) as duration,
          MAX(CASE WHEN is_landing_page = 1 THEN page_url ELSE '' END) as landing_page,
          MAX(CASE WHEN is_exit_page = 1 THEN page_url ELSE '' END) as exit_page,
          MAX(utm_source) as utm_source,
          MAX(utm_medium) as utm_medium,
          MAX(utm_campaign) as utm_campaign,
          MAX(device_type) as device_type,
          MAX(browser) as browser,
          MAX(os) as os
        FROM analytics.visit_logs
        WHERE ${whereClause}
        GROUP BY session_id, user_id
        ORDER BY session_start DESC
        LIMIT ${limit}
      ),
      session_pages AS (
        SELECT 
          v.session_id,
          v.page_url,
          v.page_title,
          v.page_sequence,
          toString(v.timestamp) as timestamp,
          v.time_on_page,
          v.event_type,
          v.is_landing_page,
          v.is_exit_page,
          v.http_status
        FROM analytics.visit_logs v
        INNER JOIN session_list s ON v.session_id = s.session_id
        ORDER BY v.session_id, v.page_sequence
      )
      SELECT 
        s.*,
        groupArray((p.page_url, p.page_title, p.page_sequence, p.timestamp, p.time_on_page, p.event_type, p.is_landing_page, p.is_exit_page, p.http_status)) as pages
      FROM session_list s
      LEFT JOIN session_pages p ON s.session_id = p.session_id
      GROUP BY s.session_id, s.user_id, s.session_start, s.session_end, s.total_pages, s.duration, s.landing_page, s.exit_page, s.utm_source, s.utm_medium, s.utm_campaign, s.device_type, s.browser, s.os
      ORDER BY s.session_start DESC
    `;

    const result = await clickhouse.query({
      query: sessionsQuery,
      format: 'JSONEachRow',
    });

    const data = await result.json() as Array<any>;

    // Helper function to convert ClickHouse timestamp string to ISO format with UTC indicator
    const toISOString = (timestampStr: string): string => {
      if (!timestampStr) return timestampStr;
      // ClickHouse toString returns format like "2025-12-04 07:08:02"
      // Convert to ISO format: "2025-12-04T07:08:02Z"
      if (timestampStr.includes('T') || timestampStr.endsWith('Z')) {
        // Already in ISO format
        return timestampStr;
      }
      // Replace space with T and add Z for UTC
      return timestampStr.replace(' ', 'T') + 'Z';
    };

    // Process the results to format the page journey
    const sessions = data.map((session: any) => {
      // Parse all events (pageviews and page_exit events)
      const parsedPages = (session.pages || []).map((page: any) => ({
        page_url: page[0],
        page_title: page[1],
        page_sequence: page[2],
        timestamp: toISOString(page[3]), // Convert to ISO format with UTC indicator
        time_on_page: page[4],
        event_type: page[5],
        is_landing_page: page[6],
        is_exit_page: page[7],
        http_status: page[8] || 200,
      }));

      // Check if session has ended (has a page_exit event with is_exit_page = 1)
      const exitEvent = parsedPages.find((page: any) =>
        page.event_type === 'page_exit' && page.is_exit_page === 1
      );

      // Filter to only pageview events for display
      const pages = parsedPages
        .filter((page: any) => page.event_type === 'pageview')
        .map((page: any) => ({
          page_url: page.page_url,
          page_title: page.page_title,
          page_sequence: page.page_sequence,
          timestamp: page.timestamp,
          time_on_page: page.time_on_page,
          event_type: page.event_type,
          is_landing_page: page.is_landing_page,
          is_exit_page: page.is_exit_page,
          http_status: page.http_status || 200,
          exit_timestamp: null,
        }));

      return {
        session_id: session.session_id,
        user_id: session.user_id,
        session_start: toISOString(session.session_start), // Convert to ISO format with UTC indicator
        session_end: toISOString(session.session_end), // Convert to ISO format with UTC indicator
        total_pages: session.total_pages,
        landing_page: session.landing_page,
        exit_page: session.exit_page,
        utm_source: session.utm_source || 'Direct',
        utm_medium: session.utm_medium || '(none)',
        utm_campaign: session.utm_campaign || '',
        device_type: session.device_type,
        browser: session.browser,
        os: session.os,
        duration: Math.round(session.duration || 0), // GA-aligned: time from first pageview to last pageview (excluding exit page time)
        pages: pages,
        has_exit_event: !!exitEvent, // Add flag to indicate if session has ended
        exit_page_url: exitEvent ? exitEvent.page_url : null, // Store exit page URL
      };
    });

    return NextResponse.json({
      success: true,
      sessions,
      count: sessions.length,
    });

  } catch (error) {
    console.error('Session journeys API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
});

