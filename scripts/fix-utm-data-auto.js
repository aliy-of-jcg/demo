/**
 * Script to fix problematic UTM data in ClickHouse
 * Usage: node scripts/fix-utm-data-auto.js
 */

const { createClient } = require('@clickhouse/client');

const clickhouse = createClient({
  url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  database: process.env.CLICKHOUSE_DATABASE || 'analytics',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
});

async function fixUTMData() {
  console.log('🔧 UTM Data Fix Script - AUTO MODE\n');
  console.log('This script will automatically fix the following issues:\n');
  console.log('1. Convert utm_source="direct" + utm_medium="none" → empty strings');
  console.log('2. Convert "none" values → empty strings');
  console.log('3. Convert "not set" values → empty strings\n');

  try {
    // Check current problematic records
    console.log('📊 Checking current problematic records...\n');
    
    const checkQuery = `
      SELECT 
        utm_source,
        utm_medium,
        utm_campaign,
        COUNT(*) as record_count
      FROM analytics.visit_logs 
      WHERE 
        (utm_source = 'direct' AND utm_medium = 'none') OR
        (utm_source = 'none' OR utm_medium = 'none') OR
        (utm_source = 'not set' OR utm_medium = 'not set') OR
        (utm_source = 'select' OR utm_medium = 'select')
      GROUP BY utm_source, utm_medium, utm_campaign 
      ORDER BY record_count DESC
    `;

    const checkResult = await clickhouse.query({
      query: checkQuery,
      format: 'JSONEachRow'
    });

    const checkData = await checkResult.json();

    if (checkData.length === 0) {
      console.log('✅ No problematic records found! Nothing to fix.\n');
      await clickhouse.close();
      return;
    }

    console.log('Found problematic records:');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('Source'.padEnd(20), 'Medium'.padEnd(20), 'Campaign'.padEnd(30), 'Records');
    console.log('───────────────────────────────────────────────────────────────────────────────');
    
    let totalToFix = 0;
    checkData.forEach((row, idx) => {
      const source = row.utm_source || '(empty)';
      const medium = row.utm_medium || '(empty)';
      const campaign = row.utm_campaign || '(empty)';
      totalToFix += parseInt(row.record_count);
      console.log(
        `${idx + 1}. ${source.padEnd(17)}`,
        medium.padEnd(20),
        campaign.padEnd(30),
        row.record_count
      );
    });
    console.log(`\nTotal records to fix: ${totalToFix}\n`);

    console.log('🔄 Starting fix process...\n');

    // Fix 1: Direct traffic with "direct" and "none" values
    console.log('Fix 1: Converting direct traffic to empty UTM values...');
    
    const fix1Query = `
      ALTER TABLE analytics.visit_logs 
      UPDATE 
        utm_source = '',
        utm_medium = '',
        utm_campaign = ''
      WHERE 
        utm_source = 'direct' AND utm_medium = 'none' AND utm_campaign = 'direct_traffic'
    `;

    await clickhouse.command({
      query: fix1Query
    });

    console.log('✅ Direct traffic records updated\n');

    // Fix 2: Records with "none" as source or medium
    console.log('Fix 2: Converting "none" values to empty strings...');
    
    const fix2Query = `
      ALTER TABLE analytics.visit_logs 
      UPDATE 
        utm_source = CASE WHEN utm_source = 'none' THEN '' ELSE utm_source END,
        utm_medium = CASE WHEN utm_medium = 'none' THEN '' ELSE utm_medium END
      WHERE 
        utm_source = 'none' OR utm_medium = 'none'
    `;

    await clickhouse.command({
      query: fix2Query
    });

    console.log('✅ "None" values converted to empty strings\n');

    // Fix 3: Records with "not set" as source or medium
    console.log('Fix 3: Converting "not set" values to empty strings...');
    
    const fix3Query = `
      ALTER TABLE analytics.visit_logs 
      UPDATE 
        utm_source = CASE WHEN utm_source = 'not set' THEN '' ELSE utm_source END,
        utm_medium = CASE WHEN utm_medium = 'not set' THEN '' ELSE utm_medium END
      WHERE 
        utm_source = 'not set' OR utm_medium = 'not set'
    `;

    await clickhouse.command({
      query: fix3Query
    });

    console.log('✅ "Not set" values converted to empty strings\n');

    // Fix 4: Records with "select" as source or medium
    console.log('Fix 4: Converting "select" values to empty strings...');
    
    const fix4Query = `
      ALTER TABLE analytics.visit_logs 
      UPDATE 
        utm_source = CASE WHEN utm_source = 'select' THEN '' ELSE utm_source END,
        utm_medium = CASE WHEN utm_medium = 'select' THEN '' ELSE utm_medium END
      WHERE 
        utm_source = 'select' OR utm_medium = 'select'
    `;

    await clickhouse.command({
      query: fix4Query
    });

    console.log('✅ "Select" values converted to empty strings\n');

    // Wait for mutations to complete
    console.log('⏳ Waiting for mutations to complete...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Optimize table to apply changes
    console.log('🔄 Optimizing table to apply changes...');
    await clickhouse.command({
      query: 'OPTIMIZE TABLE analytics.visit_logs FINAL'
    });

    console.log('✅ Table optimized\n');

    // Wait a bit more for optimization to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify the fix
    console.log('🔍 Verifying fixes...\n');
    
    const verifyResult = await clickhouse.query({
      query: checkQuery,
      format: 'JSONEachRow'
    });

    const verifyData = await verifyResult.json();

    if (verifyData.length === 0) {
      console.log('✅ SUCCESS! All problematic records have been fixed!\n');
    } else {
      console.log('⚠️  Some problematic records still remain:');
      console.log('═══════════════════════════════════════════════════════════════════════════════');
      verifyData.forEach((row, idx) => {
        const source = row.utm_source || '(empty)';
        const medium = row.utm_medium || '(empty)';
        const campaign = row.utm_campaign || '(empty)';
        console.log(
          `${idx + 1}. ${source.padEnd(17)}`,
          medium.padEnd(20),
          campaign.padEnd(30),
          row.record_count
        );
      });
      console.log('\n');
    }

    // Show final statistics
    console.log('📈 Final UTM Statistics:\n');
    
    const finalQuery = `
      SELECT 
        CASE 
          WHEN utm_source = '' THEN 'Direct'
          ELSE utm_source
        END as source,
        CASE 
          WHEN utm_medium = '' THEN '(not set)'
          ELSE utm_medium
        END as medium,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(*) as record_count
      FROM analytics.visit_logs 
      GROUP BY source, medium 
      ORDER BY record_count DESC
      LIMIT 15
    `;

    const finalResult = await clickhouse.query({
      query: finalQuery,
      format: 'JSONEachRow'
    });

    const finalData = await finalResult.json();

    console.log('Top source/medium combinations after fix:');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('Source'.padEnd(20), 'Medium'.padEnd(20), 'Users'.padEnd(10), 'Records');
    console.log('───────────────────────────────────────────────────────────────────────────────');
    
    finalData.forEach((row, idx) => {
      console.log(
        `${idx + 1}. ${row.source.padEnd(17)}`,
        row.medium.padEnd(20),
        String(row.unique_users).padEnd(10),
        row.record_count
      );
    });
    console.log('\n');

    console.log('✅ Fix process completed successfully!\n');
    console.log('🎉 You can now check the source analysis page at /source-analysis');
    console.log('   Direct traffic will show as "Direct" with "(not set)" medium');
    console.log('   Campaign traffic will show proper media platforms (Kakao, Naver, etc.)\n');

  } catch (error) {
    console.error('❌ Error during fix process:', error);
    throw error;
  } finally {
    await clickhouse.close();
  }
}

// Run the fix
fixUTMData().catch((error) => {
  console.error('Failed to complete fix:', error);
  process.exit(1);
});

