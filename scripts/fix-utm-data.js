/**
 * Script to fix problematic UTM data in ClickHouse
 * This will update visit_logs table with proper UTM values
 */

const { createClient } = require('@clickhouse/client');
const readline = require('readline');

const clickhouse = createClient({
  url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  database: process.env.CLICKHOUSE_DATABASE || 'analytics',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function fixUTMData() {
  console.log('🔧 UTM Data Fix Script\n');
  console.log('This script will fix the following issues:\n');
  console.log('1. Convert utm_source="direct" + utm_medium="none" → empty strings');
  console.log('2. This represents direct traffic (no referral source)\n');

  try {
    // Check current problematic records
    console.log('📊 Current problematic records:\n');
    
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
        (utm_source = 'not set' OR utm_medium = 'not set')
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
      rl.close();
      return;
    }

    console.log('Found problematic records:');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('Source'.padEnd(20), 'Medium'.padEnd(20), 'Campaign'.padEnd(30), 'Records');
    console.log('───────────────────────────────────────────────────────────────────────────────');
    
    checkData.forEach((row, idx) => {
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

    // Ask for confirmation
    const answer = await askQuestion('Do you want to proceed with fixing these records? (yes/no): ');
    
    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
      console.log('❌ Fix cancelled by user.\n');
      await clickhouse.close();
      rl.close();
      return;
    }

    console.log('\n🔄 Starting fix process...\n');

    // Fix 1: Direct traffic with "direct" and "none" values
    console.log('Fix 1: Converting direct traffic to empty UTM values...');
    
    const fix1Query = `
      ALTER TABLE analytics.visit_logs 
      UPDATE 
        utm_source = '',
        utm_medium = ''
      WHERE 
        utm_source = 'direct' AND utm_medium = 'none'
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

    // Wait for mutations to complete
    console.log('⏳ Waiting for mutations to complete...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Optimize table to apply changes
    console.log('🔄 Optimizing table to apply changes...');
    await clickhouse.command({
      query: 'OPTIMIZE TABLE analytics.visit_logs FINAL'
    });

    console.log('✅ Table optimized\n');

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
        COUNT(*) as record_count
      FROM analytics.visit_logs 
      GROUP BY source, medium 
      ORDER BY record_count DESC
      LIMIT 10
    `;

    const finalResult = await clickhouse.query({
      query: finalQuery,
      format: 'JSONEachRow'
    });

    const finalData = await finalResult.json();

    console.log('Top source/medium combinations after fix:');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('Source'.padEnd(25), 'Medium'.padEnd(25), 'Records');
    console.log('───────────────────────────────────────────────────────────────────────────────');
    
    finalData.forEach((row, idx) => {
      console.log(
        `${idx + 1}. ${row.source.padEnd(22)}`,
        row.medium.padEnd(25),
        row.record_count
      );
    });
    console.log('\n');

    console.log('✅ Fix process completed successfully!\n');
    console.log('You can now check the source analysis page to see proper media platforms.\n');

  } catch (error) {
    console.error('❌ Error during fix process:', error);
    throw error;
  } finally {
    await clickhouse.close();
    rl.close();
  }
}

// Run the fix
fixUTMData().catch((error) => {
  console.error('Failed to complete fix:', error);
  process.exit(1);
});

