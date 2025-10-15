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
        ip_address String,
        user_agent String,
        device_type String,
        browser String,
        os String,
        country String,
        city String,
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
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  ip_address?: string;
  user_agent?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
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

