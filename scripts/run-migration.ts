/**
 * ClickHouse Migration Script - Phase 1
 * Adds page flow tracking columns to visit_logs table
 */

import { createClient } from '@clickhouse/client';

const clickhouse = createClient({
  url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  database: process.env.CLICKHOUSE_DATABASE || 'analytics',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
});

async function runMigration() {
  console.log('🚀 Starting ClickHouse Phase 1 Migration...\n');
  
  try {
    // Check if visit_logs table exists
    console.log('📋 Checking if visit_logs table exists...');
    const checkTableQuery = `
      SELECT count() as count 
      FROM system.tables 
      WHERE database = 'analytics' AND name = 'visit_logs'
    `;
    
    const checkResult = await clickhouse.query({
      query: checkTableQuery,
      format: 'JSONEachRow',
    });
    
    const checkData = await checkResult.json();
    
    if (checkData[0]?.count === 0) {
      console.log('❌ Error: visit_logs table does not exist!');
      console.log('   Please create the visit_logs table first.');
      process.exit(1);
    }
    
    console.log('✅ visit_logs table found\n');
    
    // Add page flow columns
    console.log('📝 Adding page flow tracking columns...');
    
    const alterQuery = `
      ALTER TABLE analytics.visit_logs
      ADD COLUMN IF NOT EXISTS page_sequence Int32 DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_landing_page UInt8 DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_exit_page UInt8 DEFAULT 0,
      ADD COLUMN IF NOT EXISTS previous_page_url String DEFAULT ''
    `;
    
    await clickhouse.command({
      query: alterQuery,
    });
    
    console.log('✅ Columns added successfully\n');
    
    // Verify columns were added
    console.log('🔍 Verifying migration...');
    const describeQuery = `DESCRIBE analytics.visit_logs`;
    
    const describeResult = await clickhouse.query({
      query: describeQuery,
      format: 'JSONEachRow',
    });
    
    const columns = await describeResult.json();
    
    const newColumns = [
      'page_sequence',
      'is_landing_page',
      'is_exit_page',
      'previous_page_url'
    ];
    
    const foundColumns = columns.filter((col: any) => 
      newColumns.includes(col.name)
    );
    
    console.log('\n📊 Table Structure (new columns):');
    foundColumns.forEach((col: any) => {
      console.log(`   ✅ ${col.name.padEnd(20)} ${col.type}`);
    });
    
    if (foundColumns.length === 4) {
      console.log('\n✨ Migration completed successfully!');
      console.log('🎉 All page flow tracking columns are now available.\n');
    } else {
      console.log(`\n⚠️  Warning: Expected 4 columns, found ${foundColumns.length}`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await clickhouse.close();
  }
}

// Run migration
runMigration();

