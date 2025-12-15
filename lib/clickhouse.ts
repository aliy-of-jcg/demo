import { createClient } from '@clickhouse/client';

const clickhouse = createClient({
  url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  database: process.env.CLICKHOUSE_DATABASE || 'analytics',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
});

export default clickhouse;

/**
 * Query ClickHouse with memory limits and optional cardinality protection
 * 
 * Query Modes:
 * - 'exact': For queries requiring complete, accurate results (KPIs, totals, time-series)
 *   - No cardinality limits (allows full aggregation)
 *   - Use for: total visitors, conversions, hourly/daily breakdowns, low-cardinality groups
 * 
 * - 'exploratory': For high-cardinality queries that can tolerate partial results
 *   - Applies cardinality limits to prevent memory explosions
 *   - Use for: session journeys, user-level analytics, tracking code breakdowns
 *   - WARNING: May return partial results if cardinality limit exceeded
 * 
 * @param query - SQL query string
 * @param options - Query options
 * @param options.queryMode - 'exact' (default) for complete results, 'exploratory' for high-cardinality queries
 * @param options.format - Output format
 * @returns Query result
 */
export async function queryWithMemoryLimit(
  query: string,
  options?: {
    queryMode?: 'exact' | 'exploratory';
    format?: 'JSONEachRow' | 'JSON' | 'CSV' | 'TabSeparated';
    query_params?: Record<string, any>;
    [key: string]: any;
  }
) {
  const queryMode = options?.queryMode ?? 'exact';
  const isExploratory = queryMode === 'exploratory';

  return clickhouse.query({
    query,
    format: options?.format || 'JSONEachRow',
    clickhouse_settings: {
      // RAM limit: 1GB per query (conservative limit for shared system)
      max_memory_usage: 1_000_000_000, // 1GB

      // Disk spill: Use disk when RAM limit reached
      max_bytes_before_external_group_by: 500_000_000, // 500MB
      max_bytes_before_external_sort: 500_000_000, // 500MB

      // Cardinality protection (ONLY for exploratory queries)
      // and returns PARTIAL results once limit is reached. Use only when incomplete
      // results are acceptable (e.g., top N sessions, exploratory analytics).
      ...(isExploratory ? {
        max_rows_to_group_by: 1_000_000, // 1M unique groups max
        group_by_overflow_mode: 'break', // Stops creating new groups, returns partial results (does NOT fail)
      } : {}),

      // Scan limits: Always enabled (protects against runaway queries)
      max_rows_to_read: 100_000_000, // 100M rows max
      max_bytes_to_read: 50_000_000_000, // 50GB max

      // Join safety: Always enabled
      max_bytes_in_join: 500_000_000, // 500MB max for join operations

      // Result limits: Tighter limits for practical application consumption
      // 100MB is more reasonable than 1GB for API responses
      max_result_rows: 1_000_000, // 1M rows max in result
      max_result_bytes: 100_000_000, // 100MB max in result (was 1GB - too permissive)

      // Timeout: 5 minutes max (prevents hanging queries)
      max_execution_time: 300, // 5 minutes
    } as Record<string, string | number>,
    ...options,
  });
}

/**
 * Helper for exact queries (KPIs, totals, time-series)
 * Ensures complete, accurate results without cardinality limits
 * 
 * Use for:
 * - Total visitors/users/sessions
 * - Hourly/daily time-series (low cardinality)
 * - Channel/device/browser breakdowns (low cardinality)
 * - Conversion totals
 * - Revenue calculations
 */
export async function queryExact(
  query: string,
  options?: {
    format?: 'JSONEachRow' | 'JSON' | 'CSV' | 'TabSeparated';
    query_params?: Record<string, any>;
    [key: string]: any;
  }
) {
  return queryWithMemoryLimit(query, { ...options, queryMode: 'exact' });
}

/**
 * Helper for exploratory queries (high-cardinality, can tolerate partial results)
 * Applies cardinality limits to prevent memory explosions
 * 
 * Use for:
 * - Session journeys (GROUP BY session_id)
 * - User-level analytics (GROUP BY user_id)
 * - Tracking code breakdowns (thousands of codes)
 * - Page URL aggregations (thousands of URLs)
 * 
 * WARNING: May return partial results if cardinality limit (1M groups) is exceeded
 */
export async function queryExploratory(
  query: string,
  options?: {
    format?: 'JSONEachRow' | 'JSON' | 'CSV' | 'TabSeparated';
    query_params?: Record<string, any>;
    [key: string]: any;
  }
) {
  return queryWithMemoryLimit(query, { ...options, queryMode: 'exploratory' });
}

/**
 * Insert data into ClickHouse with async buffer tables (GA-style)
 * Uses buffer tables to prevent memory limit errors during materialized view updates
 * Buffer tables flush to destination tables asynchronously, preventing blocking
 * 
 * @param options - Insert options (table, values, format, etc.)
 * @returns Insert result
 */
export async function insertWithMemoryLimit(
  options: {
    table: string;
    values: any[] | any;
    format?: 'JSONEachRow' | 'JSON' | 'CSV' | 'TabSeparated';
    [key: string]: any;
  }
) {
  // Route inserts to buffer tables for async processing
  // This prevents synchronous materialized view updates from blocking inserts
  let targetTable = options.table;

  if (targetTable === 'analytics.tracking_events') {
    targetTable = 'analytics.tracking_events_buffer';
  } else if (targetTable === 'analytics.visit_logs') {
    targetTable = 'analytics.visit_logs_buffer';
  }

  return clickhouse.insert({
    ...options,
    table: targetTable,
    clickhouse_settings: {
      // Memory limit: 2GB per insert (safety net, but buffer tables prevent most issues)
      max_memory_usage: 2_000_000_000, // 2GB

      // External sorting/grouping: Use disk when RAM limit reached
      max_bytes_before_external_group_by: 1_000_000_000, // 1GB
      max_bytes_before_external_sort: 1_000_000_000, // 1GB

      // Insert timeout: 2 minutes max (inserts should be fast)
      max_execution_time: 120, // 2 minutes

      // Allow external aggregation (use disk when needed)
    } as Record<string, string | number>,
  });
}

export const initClickHouseSchema = async () => {
  await clickhouse.command({
    query: `CREATE DATABASE IF NOT EXISTS analytics`,
  });

  await clickhouse.command({
    query: `
      CREATE TABLE IF NOT EXISTS analytics.tracking_events (
      id String,
      tracking_code String,
      campaign_name String,
      utm_source String,
      utm_medium String,
      utm_campaign String,
      utm_content String,
      utm_term String,
      referrer String,
      referrer_domain String,
      referrer_source String,
      referrer_is_known UInt8,
      ip_address String,
      user_agent String,
      device_type String,
      device_vendor String,
      device_model String,
      browser String,
      browser_version String,
      os String,
      os_version String,
      engine String,
      is_mobile_app UInt8,
      app_name String,
      is_bot UInt8,
      country String,
      city String,
      region String,
      timezone String,
      timestamp DateTime DEFAULT now(),
      created_date Date DEFAULT toDate(timestamp)
    ) ENGINE = MergeTree()
    PARTITION BY toYYYYMM(created_date)
    ORDER BY (created_date, tracking_code, timestamp)
    SETTINGS index_granularity = 8192
    `,
  });


  await clickhouse.command({
    query: `
     CREATE TABLE IF NOT EXISTS analytics.visit_logs (
      timestamp DateTime,
      session_id String,
      user_id String,
      page_url String,
      page_title String,
      referrer String,
      referrer_domain String,
      tracking_code String DEFAULT '',
      utm_source String,
      utm_medium String,
      utm_campaign String,
      utm_term String,
      utm_content String,
      campaign_id Int32,
      course_id Int32,
      user_agent String,
      device_type String,
      os String,
      browser String,
      screen_resolution String,
      visit_count Int32,
      is_new_visitor UInt8,
      time_on_page Int32,
      event_type String,
      page_sequence Int32 DEFAULT 0,
      is_landing_page UInt8 DEFAULT 0,
      is_exit_page UInt8 DEFAULT 0,
      previous_page_url String DEFAULT '',
      session_page_count Int32 DEFAULT 0,
      conversion_type String DEFAULT '',
      conversion_value Float64 DEFAULT 0,
      conversion_metadata String DEFAULT ''
    ) ENGINE = MergeTree()
    PARTITION BY toYYYYMM(toTimeZone(timestamp, 'Asia/Seoul'))
    ORDER BY (toDate(toTimeZone(timestamp, 'Asia/Seoul')), session_id, user_id)
    SETTINGS index_granularity = 8192
    `,
  });

  console.log('ClickHouse schema initialized successfully');
};

export interface TrackingEvent {
  id: string;
  tracking_code: string;
  campaign_name: string;

  // UTM Parameters
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content?: string;
  utm_term?: string;

  // Referrer Data
  referrer?: string;
  referrer_domain?: string;
  referrer_source?: string;
  referrer_is_known?: number;

  // User Data
  ip_address?: string;
  user_agent?: string;

  // Device Info
  device_type?: string;
  device_vendor?: string;
  device_model?: string;

  // Browser Info
  browser?: string;
  browser_version?: string;

  // OS Info
  os?: string;
  os_version?: string;

  // Engine
  engine?: string;

  // App Detection
  is_mobile_app?: number;
  app_name?: string;
  is_bot?: number;

  // Location
  country?: string;
  city?: string;
  region?: string;
  timezone?: string;
}

export interface TrackingCode {
  id: string;
  tracking_code: string;
  campaign_name: string;
  target_url: string;
  description?: string;
  created_by: string;
  is_active: boolean;
}

