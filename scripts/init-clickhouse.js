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
    console.log('✅ Table tracking_events created\n');

    console.log('Creating table: tracking_codes');
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
    console.log('✅ Table tracking_codes created\n');

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

