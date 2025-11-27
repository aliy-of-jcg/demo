/**
 * Phase 1 ClickHouse Migration Script (Node.js version)
 * 
 * This script performs the same migration as migrate-clickhouse-phase1.sql
 * but can be run programmatically from Node.js
 * 
 * Usage:
 *   node scripts/migrate-clickhouse-phase1.js
 * 
 * Or with environment variables:
 *   CLICKHOUSE_HOST=http://localhost:8123 node scripts/migrate-clickhouse-phase1.js
 */

const { createClient } = require('@clickhouse/client');

try {
  require('dotenv').config();
} catch (e) {
  console.log('ℹ️  dotenv not found, using default values\n');
}

const clickhouse = createClient({
  url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  database: process.env.CLICKHOUSE_DATABASE || 'analytics',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
});

async function executeQuery(query, description) {
  console.log(`\n📋 ${description}...`);
  try {
    await clickhouse.command({ query });
    console.log(`✅ ${description} - Success`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} - Error:`, error.message);
    throw error;
  }
}

async function getRowCount(table) {
  try {
    const result = await clickhouse.query({
      query: `SELECT COUNT(*) as count FROM ${table}`,
      format: 'JSONEachRow',
    });
    const data = await result.json();
    return data[0]?.count || 0;
  } catch (error) {
    console.error(`Error getting row count for ${table}:`, error.message);
    return 0;
  }
}

async function verifyDataIntegrity() {
  console.log('\n🔍 Verifying data integrity...');
  const oldCount = await getRowCount('analytics.visit_logs');
  const newCount = await getRowCount('analytics.visit_logs_new');

  console.log(`   Old table rows: ${oldCount}`);
  console.log(`   New table rows: ${newCount}`);

  if (oldCount === newCount) {
    console.log('✅ Row counts match!');
    return true;
  } else {
    console.error('❌ Row counts do not match!');
    return false;
  }
}

async function getTableSchema(table) {
  console.log(`\n🔍 Getting schema for ${table}...`);
  try {
    const result = await clickhouse.query({
      query: `DESCRIBE TABLE ${table}`,
      format: 'JSONEachRow',
    });
    const columns = await result.json();
    console.log(`   Found ${columns.length} columns`);
    // Debug: show column names if needed
    if (process.env.DEBUG_SCHEMA === 'true') {
      console.log(`   Columns: ${columns.map(c => c.name).join(', ')}`);
    }
    return columns;
  } catch (error) {
    console.error(`   Error getting schema:`, error.message);
    throw error;
  }
}

async function buildCreateTableQuery(columns) {
  const columnDefs = columns.map(col => {
    // Handle default expressions - they might be functions or literals
    let defaultExpr = '';
    if (col.default_expression && col.default_expression !== '') {
      // Default expressions in ClickHouse can be:
      // - Empty string: ''
      // - Numbers: 0
      // - Functions: now(), toDate(...)
      // - Strings: 'value'
      // We use them as-is since ClickHouse validates them
      defaultExpr = ` DEFAULT ${col.default_expression}`;
    }
    return `      ${col.name} ${col.type}${defaultExpr}`;
  }).join(',\n');

  return `
    CREATE TABLE IF NOT EXISTS analytics.visit_logs_new (
${columnDefs}
    ) ENGINE = MergeTree()
    PARTITION BY toYYYYMM(toTimeZone(timestamp, 'Asia/Seoul'))
    ORDER BY (toDate(toTimeZone(timestamp, 'Asia/Seoul')), session_id, user_id)
    SETTINGS index_granularity = 8192
  `;
}

async function checkProjectionStatus() {
  console.log('\n📊 Checking projection status...');
  try {
    const result = await clickhouse.query({
      query: `
        SELECT name, type, status 
        FROM system.projection_parts 
        WHERE table = 'visit_logs' AND database = 'analytics'
      `,
      format: 'JSONEachRow',
    });
    const data = await result.json();
    if (data.length > 0) {
      console.log('   Projections:');
      data.forEach(proj => {
        console.log(`   - ${proj.name}: ${proj.status}`);
      });
    } else {
      console.log('   No projections found yet');
    }
  } catch (error) {
    console.log('   Could not check projection status:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting Phase 1 ClickHouse Migration');
  console.log('==========================================\n');

  try {
    // Step 0: Check migration state and clean up any leftover tables
    console.log('\n🔍 Checking migration state...');

    // Check if visit_logs_old exists (from previous migration)
    let oldTableExists = false;
    try {
      await clickhouse.query({
        query: 'SELECT 1 FROM analytics.visit_logs_old LIMIT 1',
        format: 'JSONEachRow',
      });
      oldTableExists = true;
      console.log('   ⚠️  Found visit_logs_old table from previous migration');
    } catch (error) {
      // Table doesn't exist, which is fine
    }

    // Check if visit_logs_new exists (migration in progress)
    let newTableExists = false;
    try {
      await clickhouse.query({
        query: 'SELECT 1 FROM analytics.visit_logs_new LIMIT 1',
        format: 'JSONEachRow',
      });
      newTableExists = true;
      console.log('   ⚠️  Found visit_logs_new table (migration in progress)');
    } catch (error) {
      // Table doesn't exist, which is fine
    }

    // Clean up strategy
    if (oldTableExists && newTableExists) {
      // Both exist - migration was interrupted. Drop the new table and start fresh
      console.log('   🧹 Cleaning up incomplete migration...');
      await clickhouse.command({
        query: 'DROP TABLE IF EXISTS analytics.visit_logs_new'
      });
      console.log('   ✅ Dropped visit_logs_new, will start fresh');
    } else if (oldTableExists && !newTableExists) {
      // Only old table exists - migration completed but cleanup didn't happen
      // Ask user or auto-clean (we'll auto-clean for now)
      console.log('   ℹ️  Previous migration completed. Dropping old backup table...');
      await clickhouse.command({
        query: 'DROP TABLE IF EXISTS analytics.visit_logs_old'
      });
      console.log('   ✅ Cleaned up old backup table');
    } else if (newTableExists && !oldTableExists) {
      // Only new table exists - migration was interrupted before swap
      console.log('   🧹 Cleaning up incomplete migration...');
      await clickhouse.command({
        query: 'DROP TABLE IF EXISTS analytics.visit_logs_new'
      });
      console.log('   ✅ Dropped visit_logs_new, will start fresh');
    } else {
      console.log('   ✅ No leftover tables found, starting fresh migration');
    }

    // Step 0.5: Get the actual schema from existing table
    const existingColumns = await getTableSchema('analytics.visit_logs');

    // Step 1: Create new partitioned table using the actual schema
    const createTableQuery = await buildCreateTableQuery(existingColumns);

    await executeQuery(createTableQuery, 'Step 1: Create new partitioned table');

    // Verify the new table has the same number of columns
    const newTableColumns = await getTableSchema('analytics.visit_logs_new');
    if (existingColumns.length !== newTableColumns.length) {
      console.error(`\n❌ Column count mismatch!`);
      console.error(`   Old table: ${existingColumns.length} columns`);
      console.error(`   New table: ${newTableColumns.length} columns`);
      throw new Error(`Column count mismatch: expected ${existingColumns.length}, got ${newTableColumns.length}`);
    }
    console.log(`✅ Column count verified: ${existingColumns.length} columns`);

    // Step 2: Copy data
    console.log('\n📦 Step 2: Copying data from old table to new table...');
    console.log('   This may take a while depending on data size...');

    // Build column list for explicit INSERT to avoid column mismatch issues
    const columnNames = existingColumns.map(col => col.name).join(', ');
    const copyQuery = `INSERT INTO analytics.visit_logs_new (${columnNames}) SELECT ${columnNames} FROM analytics.visit_logs`;
    await executeQuery(copyQuery, 'Step 2: Copy data');

    // Step 3: Verify data integrity
    const isValid = await verifyDataIntegrity();
    if (!isValid) {
      console.error('\n❌ Data integrity check failed! Aborting migration.');
      process.exit(1);
    }

    // Step 4: Swap tables
    console.log('\n⚠️  Step 4: Swapping tables...');
    console.log('   This will rename the old table to visit_logs_old');

    // Check if visit_logs_old already exists (from previous migration)
    let oldBackupExists = false;
    try {
      await clickhouse.query({
        query: 'SELECT 1 FROM analytics.visit_logs_old LIMIT 1',
        format: 'JSONEachRow',
      });
      oldBackupExists = true;
    } catch (error) {
      // Table doesn't exist, which is fine
    }

    if (oldBackupExists) {
      console.log('   ⚠️  visit_logs_old already exists. Dropping it first...');
      await clickhouse.command({
        query: 'DROP TABLE IF EXISTS analytics.visit_logs_old'
      });
      console.log('   ✅ Dropped old backup table');
    }

    const swapQuery = `
      RENAME TABLE 
        analytics.visit_logs TO analytics.visit_logs_old,
        analytics.visit_logs_new TO analytics.visit_logs
    `;
    await executeQuery(swapQuery, 'Step 4: Swap tables');

    // Step 5: Add projections
    const projections = [
      {
        name: 'campaign_date_projection',
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
        `,
        description: 'Campaign + Date aggregations'
      },
      {
        name: 'channel_date_projection',
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
        `,
        description: 'Channel + Date aggregations'
      },
      {
        name: 'conversion_date_projection',
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
        `,
        description: 'Conversion type + Date aggregations'
      },
      {
        name: 'tracking_code_date_projection',
        query: `
          ALTER TABLE analytics.visit_logs 
          ADD PROJECTION IF NOT EXISTS tracking_code_date_projection (
            SELECT 
              toDate(toTimeZone(timestamp, 'Asia/Seoul')) as date,
              tracking_code,
              utm_source,
              utm_medium,
              utm_campaign,
              uniqIf(session_id, tracking_code != '') as sessions,
              countDistinctIf(user_id, tracking_code != '') as users,
              countIf(tracking_code != '' AND event_type = 'conversion') as conversions
            GROUP BY date, tracking_code, utm_source, utm_medium, utm_campaign
          )
        `,
        description: 'Tracking code + Date aggregations'
      }
    ];

    console.log('\n📊 Step 5: Adding projections...');
    for (const proj of projections) {
      await executeQuery(proj.query, `Adding ${proj.description}`);
    }

    // Step 6: Materialize projections
    console.log('\n🔄 Step 6: Materializing projections...');
    console.log('   This may take a while depending on data size...');
    for (const proj of projections) {
      await executeQuery(
        `ALTER TABLE analytics.visit_logs MATERIALIZE PROJECTION ${proj.name}`,
        `Materializing ${proj.name}`
      );
    }

    // Step 7: Check projection status
    await checkProjectionStatus();

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Test your application queries');
    console.log('   2. Monitor performance improvements');
    console.log('   3. After 24-48 hours of successful operation, you can drop the old table:');
    console.log('      DROP TABLE analytics.visit_logs_old;');
    console.log('\n🎉 Enjoy faster queries!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\n💡 The old table (visit_logs) should still be intact.');
    console.error('   If visit_logs_old exists, you can restore it:');
    console.error('   RENAME TABLE analytics.visit_logs_old TO analytics.visit_logs;');
    process.exit(1);
  } finally {
    await clickhouse.close();
  }
}

main();

