const { createClient } = require('@clickhouse/client');

try {
  require('dotenv').config();
} catch (e) {
  console.log('ℹ️  dotenv not found, using default values\n');
}

const clickhouse = createClient({
  url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  database: 'default',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
});

async function initSchema() {
  console.log('🔄 Initializing ClickHouse schema...\n');

  try {
    console.log('Creating database: analytics');
    await clickhouse.command({
      query: `CREATE DATABASE IF NOT EXISTS analytics`,
    });
    console.log('✅ Database created\n');

    console.log('Creating table: tracking_events');
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
    console.log('✅ Table tracking_events created\n');

    console.log('Creating table: visit_logs');
    await clickhouse.command({
      query: `
          CREATE TABLE IF NOT EXISTS analytics.visit_logs (
      timestamp DateTime,
      session_id String,
      user_id String,
      page_url String,
      page_title String,
      referrer String,
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
      conversion_metadata String DEFAULT '',
      http_status Int32 DEFAULT 200
    ) ENGINE = MergeTree()
    ORDER BY (timestamp, session_id, user_id)
    SETTINGS index_granularity = 8192
  `,
    });
    console.log('✅ Table visit_logs created\n');

    console.log('Verifying tables...');
    const result = await clickhouse.query({
      query: 'SHOW TABLES FROM analytics',
      format: 'JSONEachRow',
    });
    const tables = await result.json();
    console.log('📋 Tables in analytics database:', tables);

    console.log('\n✨ Schema initialization completed successfully!');

    await clickhouse.close();
  } catch (error) {
    console.error('❌ Error initializing schema:', error);
    process.exit(1);
  }
}

initSchema();

