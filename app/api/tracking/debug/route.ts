import { NextRequest, NextResponse } from 'next/server';
import clickhouse from '@/lib/clickhouse';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Query recent tracking events from ClickHouse (last 24 hours)
    const query = await clickhouse.query({
      query: `
        SELECT 
          timestamp,
          session_id,
          user_id,
          page_url,
          page_title,
          device_type,
          utm_source,
          utm_campaign,
          event_type,
          visit_count,
          is_new_visitor
        FROM analytics.visit_logs
        WHERE timestamp >= now() - INTERVAL 1 DAY
        ORDER BY timestamp DESC
        LIMIT 50
      `,
      format: 'JSONEachRow'
    });

    const events = await query.json();

    return NextResponse.json({
      success: true,
      events: events,
      count: events.length
    });

  } catch (error) {
    console.error('[Tracking Debug] Error fetching events:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch tracking events',
      message: error instanceof Error ? error.message : String(error),
      events: []
    }, { status: 500 });
  }
}

