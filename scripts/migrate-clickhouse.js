const { createClient } = require('@clickhouse/client');
require('dotenv').config({ path: '.env.local' });

const clickhouse = createClient({
  url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  database: process.env.CLICKHOUSE_DATABASE || 'analytics',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
});

async function migrateSchema() {
  try {
    console.log('🔄 Starting ClickHouse schema migration...\n');

    // Drop old table if it exists (WARNING: This will delete all data)
    console.log('⚠️  Dropping old tracking_events table...');
    await clickhouse.command({
      query: `DROP TABLE IF EXISTS analytics.tracking_events`,
    });
    console.log('✅ Old table dropped\n');

    // Create new table with enhanced schema
    console.log('📝 Creating new tracking_events table with enhanced schema...');
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
    console.log('✅ New table created successfully\n');

    console.log('✨ Migration completed successfully!');
    console.log('\n📊 New schema includes:');
    console.log('   - Enhanced device info (vendor, model)');
    console.log('   - Browser and OS versions');
    console.log('   - Referrer parsing');
    console.log('   - Mobile app detection');
    console.log('   - Bot detection');
    console.log('   - GeoIP location data\n');

    await clickhouse.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await clickhouse.close();
    process.exit(1);
  }
}

migrateSchema();


