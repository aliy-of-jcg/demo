import { createClient } from '@clickhouse/client';

const clickhouse = createClient({
  url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  database: process.env.CLICKHOUSE_DATABASE || 'analytics',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
});

export default clickhouse;

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

  // Add tracking_code column to existing visit_logs table if it doesn't exist
  try {
    await clickhouse.command({
      query: `ALTER TABLE analytics.visit_logs ADD COLUMN IF NOT EXISTS tracking_code String DEFAULT ''`
    });
    await clickhouse.command({
      query: `ALTER TABLE analytics.visit_logs ADD COLUMN IF NOT EXISTS referrer_domain String DEFAULT ''`
    });
  } catch (error) {
    // Column might already exist, ignore error
    console.log('Schema update note:', error);
  }

  // Add projections for common query patterns (Phase 1 optimization)
  try {
    // Projection 1: Campaign + Date aggregations
    await clickhouse.command({
      query: `
        ALTER TABLE analytics.visit_logs 
        ADD PROJECTION IF NOT EXISTS campaign_date_projection (
          SELECT 
            toDate(toTimeZone(timestamp, 'Asia/Seoul')) as date,
            campaign_id,
            countDistinct(user_id) as unique_visitors,
            countDistinct(session_id) as sessions,
            countIf(event_type = 'conversion') as conversions,
            SUM(conversion_value) as revenue
          GROUP BY date, campaign_id
        )
      `
    });

    // Projection 2: Channel (utm_source) + Date aggregations
    await clickhouse.command({
      query: `
        ALTER TABLE analytics.visit_logs 
        ADD PROJECTION IF NOT EXISTS channel_date_projection (
          SELECT 
            toDate(toTimeZone(timestamp, 'Asia/Seoul')) as date,
            CASE 
              WHEN utm_source = '' OR utm_source = '(direct)' OR utm_source = 'Direct' THEN 'Direct'
              ELSE utm_source
            END as channel,
            countDistinct(user_id) as visitors,
            countIf(event_type = 'conversion') as conversions,
            SUM(conversion_value) as revenue
          GROUP BY date, channel
        )
      `
    });

    // Projection 3: Conversion type + Date aggregations
    await clickhouse.command({
      query: `
        ALTER TABLE analytics.visit_logs 
        ADD PROJECTION IF NOT EXISTS conversion_date_projection (
          SELECT 
            toDate(toTimeZone(timestamp, 'Asia/Seoul')) as date,
            conversion_type,
            countIf(conversion_type != '' AND event_type = 'conversion') as count,
            sumIf(conversion_value, conversion_type != '' AND event_type = 'conversion') as total_value,
            countDistinctIf(user_id, conversion_type != '' AND event_type = 'conversion') as unique_users
          GROUP BY date, conversion_type
        )
      `
    });

    // Projection 4: Tracking code + Date aggregations
    await clickhouse.command({
      query: `
        ALTER TABLE analytics.visit_logs 
        ADD PROJECTION IF NOT EXISTS tracking_code_date_projection (
          SELECT 
            toDate(toTimeZone(timestamp, 'Asia/Seoul')) as date,
            tracking_code,
            utm_source,
            utm_medium,
            utm_campaign,
            countDistinctIf(session_id, tracking_code != '') as sessions,
            countDistinctIf(user_id, tracking_code != '') as users,
            countIf(tracking_code != '' AND event_type = 'conversion') as conversions
          GROUP BY date, tracking_code, utm_source, utm_medium, utm_campaign
        )
      `
    });

    console.log('Projections added successfully');
  } catch (error) {
    // Projections might already exist, ignore error
    console.log('Projection setup note:', error);
  }

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

