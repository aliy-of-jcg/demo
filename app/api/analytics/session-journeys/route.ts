import { NextRequest, NextResponse } from 'next/server';
import clickhouse, { queryWithMemoryLimit } from '@/lib/clickhouse';
import { requirePermission, type AuthContext } from '@/lib/auth/api-middleware';
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
    // Default to last 90 days if no dates provided (prevents memory issues)
    const MAX_RANGE_DAYS = 90;
    let finalStartDate = startDate;
    let finalEndDate = endDate || new Date().toISOString().split('T')[0];
    
    if (!finalStartDate) {
      const end = new Date(finalEndDate);
      const start = new Date(end);
      start.setDate(start.getDate() - MAX_RANGE_DAYS);
      finalStartDate = start.toISOString().split('T')[0];
    }

    // Enforce maximum date window (server-side safety net)
    const startObj = new Date(finalStartDate);
    const endObj = new Date(finalEndDate);
    const diffMs = endObj.getTime() - startObj.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > MAX_RANGE_DAYS) {
      const clampedStart = new Date(endObj);
      clampedStart.setDate(clampedStart.getDate() - MAX_RANGE_DAYS);
      finalStartDate = clampedStart.toISOString().split('T')[0];
    }

    // Build WHERE clause - use direct date comparison without timezone conversion in JOINs for better performance
    const whereClause = `toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${finalStartDate}') AND toDate(toTimeZone(timestamp, '${timezone}')) <= toDate('${finalEndDate}')`;

    // Fetch all sessions with their complete page journeys
    // TWO-PHASE PATTERN (GA-style): Optimize for LIMIT performance
    // Phase 1: Get session IDs only (lightweight - just for sorting/limiting)
    // Phase 2: Aggregate only those limited sessions (heavy aggregations on small set)
    const sessionsQuery = `
      WITH session_ids AS (
        -- Phase 1: Lightweight - just get session IDs and sort key
        -- LIMIT applies here, so we only process top N sessions later
        SELECT 
          session_id,
          user_id,
          MIN(timestamp) as session_start_ts
        FROM analytics.visit_logs_buffer
        WHERE ${whereClause}
        GROUP BY session_id, user_id
        ORDER BY session_start_ts DESC
        LIMIT ${limit}
      ),
      session_list AS (
        -- Phase 2: Heavy aggregations ONLY on the ${limit} selected sessions
        -- Much more efficient than aggregating all sessions first
        SELECT 
          v.session_id,
          v.user_id,
          MIN(v.timestamp) as session_start_ts,
          MAX(v.timestamp) as session_end_ts,
          toString(MIN(v.timestamp)) as session_start,
          toString(MAX(v.timestamp)) as session_end,
          COUNT(*) as total_pages,
          -- GA Logic: Session duration = time from first pageview to last pageview (excluding exit page time)
          -- Only count pageview events, not page_exit events
          toUnixTimestamp(MAX(CASE WHEN v.event_type = 'pageview' THEN v.timestamp ELSE NULL END)) - 
          toUnixTimestamp(MIN(CASE WHEN v.event_type = 'pageview' THEN v.timestamp ELSE NULL END)) as duration,
          MAX(CASE WHEN v.is_landing_page = 1 THEN v.page_url ELSE '' END) as landing_page,
          MAX(CASE WHEN v.is_exit_page = 1 THEN v.page_url ELSE '' END) as exit_page,
          MAX(v.utm_source) as utm_source,
          MAX(v.utm_medium) as utm_medium,
          MAX(v.utm_campaign) as utm_campaign,
          MAX(v.device_type) as device_type,
          MAX(v.browser) as browser,
          MAX(v.os) as os
        FROM analytics.visit_logs_buffer v
        INNER JOIN session_ids si ON v.session_id = si.session_id AND v.user_id = si.user_id
        WHERE ${whereClause}
        GROUP BY v.session_id, v.user_id
      ),
      session_pages AS (
        -- Phase 3: Get page details for those sessions
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
        FROM analytics.visit_logs_buffer v
        INNER JOIN session_ids si ON v.session_id = si.session_id
        WHERE toDate(toTimeZone(v.timestamp, '${timezone}')) >= toDate('${finalStartDate}') 
          AND toDate(toTimeZone(v.timestamp, '${timezone}')) <= toDate('${finalEndDate}')
        ORDER BY v.session_id, v.page_sequence
      )
      SELECT 
        s.*,
        groupArray((p.page_url, p.page_title, p.page_sequence, p.timestamp, p.time_on_page, p.event_type, p.is_landing_page, p.is_exit_page, p.http_status)) as pages
      FROM session_list s
      LEFT JOIN session_pages p ON s.session_id = p.session_id
      GROUP BY s.session_id, s.user_id, s.session_start, s.session_end, s.total_pages, s.duration, s.landing_page, s.exit_page, s.utm_source, s.utm_medium, s.utm_campaign, s.device_type, s.browser, s.os, s.session_start_ts, s.session_end_ts
      ORDER BY s.session_start_ts DESC
    `;

    // High-cardinality query: GROUP BY session_id (millions of groups possible)
    // Use exploratory mode to prevent memory explosion
    const result = await queryWithMemoryLimit(sessionsQuery, {
      queryMode: 'exploratory',
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

