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
        
        -- UTM Parameters
        utm_source String,
        utm_medium String,
        utm_campaign String,
        utm_content String,
        utm_term String,
        
        -- Referrer Data
        referrer String,
        referrer_domain String,
        referrer_source String,
        referrer_is_known UInt8,
        
        -- User Data
        ip_address String,
        user_agent String,
        
        -- Device Info (Enhanced)
        device_type String,
        device_vendor String,
        device_model String,
        
        -- Browser Info (Enhanced)
        browser String,
        browser_version String,
        
        -- OS Info (Enhanced)
        os String,
        os_version String,
        
        -- Engine
        engine String,
        
        -- App Detection
        is_mobile_app UInt8,
        app_name String,
        is_bot UInt8,
        
        -- Location
        country String,
        city String,
        region String,
        timezone String,
        
        -- Timestamps
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
      CREATE TABLE IF NOT EXISTS analytics.tracking_codes (
        id String,
        tracking_code String,
        campaign_name String,
        target_url String,
        description String,
        created_by String,
        created_at DateTime DEFAULT now(),
        is_active UInt8 DEFAULT 1
      ) ENGINE = ReplacingMergeTree(created_at)
      ORDER BY (id)
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

