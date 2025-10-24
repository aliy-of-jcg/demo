/**
 * Clear Old Tracking Data
 * This script clears all visit_logs data from ClickHouse
 * to start fresh with the new browser/OS detection
 */

import { createClient } from '@clickhouse/client';

const clickhouse = createClient({
  url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  database: process.env.CLICKHOUSE_DATABASE || 'analytics',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
});

async function clearData() {
  console.log('🧹 Starting data cleanup...\n');
  
  try {
    // Check how many records exist
    console.log('📊 Checking current data...');
    const countQuery = `SELECT COUNT(*) as count FROM analytics.visit_logs`;
    
    const countResult = await clickhouse.query({
      query: countQuery,
      format: 'JSONEachRow',
    });
    
    const countData = await countResult.json();
    const recordCount = countData[0]?.count || 0;
    
    console.log(`   Found ${recordCount} records in visit_logs\n`);
    
    if (recordCount === 0) {
      console.log('✨ No data to clear. Database is already clean!');
      return;
    }
    
    // Clear the table
    console.log('🗑️  Clearing visit_logs table...');
    await clickhouse.command({
      query: `TRUNCATE TABLE analytics.visit_logs`,
    });
    
    console.log('✅ visit_logs table cleared successfully!\n');
    
    // Verify
    const verifyResult = await clickhouse.query({
      query: countQuery,
      format: 'JSONEachRow',
    });
    
    const verifyData = await verifyResult.json();
    const newCount = verifyData[0]?.count || 0;
    
    console.log('🔍 Verification:');
    console.log(`   Records before: ${recordCount}`);
    console.log(`   Records after:  ${newCount}\n`);
    
    if (newCount === 0) {
      console.log('✨ Success! All old data has been cleared.');
      console.log('🎉 You can now start fresh with accurate browser/OS tracking!\n');
      console.log('💡 Next steps:');
      console.log('   1. Visit your site to generate new tracking data');
      console.log('   2. Check Environment Analysis page to see accurate results\n');
    } else {
      console.log('⚠️  Warning: Some records still remain. Please check manually.');
    }
    
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    process.exit(1);
  } finally {
    await clickhouse.close();
  }
}

// Run cleanup
clearData();

