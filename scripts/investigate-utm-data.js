/**
 * Script to investigate and fix UTM data in ClickHouse
 * This will examine visit_logs table for problematic UTM values
 */

const { createClient } = require('@clickhouse/client');

const clickhouse = createClient({
  url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  database: process.env.CLICKHOUSE_DATABASE || 'analytics',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
});

async function investigateUTMData() {
  console.log('🔍 Starting UTM Data Investigation...\n');

  try {
    // Step 1: Get overview of all UTM combinations
    console.log('📊 Step 1: Analyzing all UTM source/medium/campaign combinations...\n');
    
    const overviewQuery = `
      SELECT 
        utm_source,
        utm_medium,
        utm_campaign,
        COUNT(*) as record_count,
        COUNT(DISTINCT user_id) as unique_users,
        MIN(timestamp) as first_seen,
        MAX(timestamp) as last_seen
      FROM analytics.visit_logs 
      GROUP BY utm_source, utm_medium, utm_campaign 
      ORDER BY record_count DESC
      LIMIT 50
    `;

    const overviewResult = await clickhouse.query({
      query: overviewQuery,
      format: 'JSONEachRow'
    });

    const overviewData = await overviewResult.json();
    
    console.log('Top UTM combinations:');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('Source'.padEnd(20), 'Medium'.padEnd(20), 'Campaign'.padEnd(30), 'Records');
    console.log('───────────────────────────────────────────────────────────────────────────────');
    
    overviewData.forEach((row, idx) => {
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

    // Step 2: Find problematic records
    console.log('🚨 Step 2: Finding problematic UTM values...\n');
    
    const problematicQuery = `
      SELECT 
        utm_source,
        utm_medium,
        utm_campaign,
        COUNT(*) as record_count,
        COUNT(DISTINCT user_id) as unique_users
      FROM analytics.visit_logs 
      WHERE 
        utm_source IN ('none', 'not set', 'select') OR
        utm_medium IN ('none', 'not set', 'select') OR
        utm_source = '' OR
        utm_medium = ''
      GROUP BY utm_source, utm_medium, utm_campaign 
      ORDER BY record_count DESC
    `;

    const problematicResult = await clickhouse.query({
      query: problematicQuery,
      format: 'JSONEachRow'
    });

    const problematicData = await problematicResult.json();

    if (problematicData.length === 0) {
      console.log('✅ No problematic UTM values found! All records have proper source/medium values.\n');
    } else {
      console.log('❌ Found problematic UTM combinations:');
      console.log('═══════════════════════════════════════════════════════════════════════════════');
      console.log('Source'.padEnd(20), 'Medium'.padEnd(20), 'Campaign'.padEnd(30), 'Records');
      console.log('───────────────────────────────────────────────────────────────────────────────');
      
      problematicData.forEach((row, idx) => {
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

    // Step 3: Check for records with empty strings
    console.log('🔎 Step 3: Checking for empty string UTM values...\n');
    
    const emptyQuery = `
      SELECT 
        CASE WHEN utm_source = '' THEN 'EMPTY' ELSE utm_source END as utm_source,
        CASE WHEN utm_medium = '' THEN 'EMPTY' ELSE utm_medium END as utm_medium,
        utm_campaign,
        COUNT(*) as record_count
      FROM analytics.visit_logs 
      WHERE utm_source = '' OR utm_medium = ''
      GROUP BY utm_source, utm_medium, utm_campaign 
      ORDER BY record_count DESC
      LIMIT 20
    `;

    const emptyResult = await clickhouse.query({
      query: emptyQuery,
      format: 'JSONEachRow'
    });

    const emptyData = await emptyResult.json();

    if (emptyData.length === 0) {
      console.log('✅ No empty UTM values found!\n');
    } else {
      console.log('Found records with empty UTM values:');
      console.log('═══════════════════════════════════════════════════════════════════════════════');
      console.log('Source'.padEnd(20), 'Medium'.padEnd(20), 'Campaign'.padEnd(30), 'Records');
      console.log('───────────────────────────────────────────────────────────────────────────────');
      
      emptyData.forEach((row, idx) => {
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

    // Step 4: Get total record count
    const totalQuery = `SELECT COUNT(*) as total FROM analytics.visit_logs`;
    const totalResult = await clickhouse.query({
      query: totalQuery,
      format: 'JSONEachRow'
    });
    const totalData = await totalResult.json();
    
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log(`📈 Total records in visit_logs: ${totalData[0].total}`);
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

    // Step 5: Sample some actual records to understand the data
    console.log('📝 Step 5: Sampling actual records for context...\n');
    
    const sampleQuery = `
      SELECT 
        timestamp,
        user_id,
        page_url,
        utm_source,
        utm_medium,
        utm_campaign,
        referrer
      FROM analytics.visit_logs 
      WHERE utm_source = 'none' OR utm_medium = 'not set'
      LIMIT 5
    `;

    try {
      const sampleResult = await clickhouse.query({
        query: sampleQuery,
        format: 'JSONEachRow'
      });

      const sampleData = await sampleResult.json();

      if (sampleData.length > 0) {
        console.log('Sample records with problematic UTM values:');
        console.log('───────────────────────────────────────────────────────────────────────────────');
        sampleData.forEach((row, idx) => {
          console.log(`\nRecord ${idx + 1}:`);
          console.log(`  Timestamp: ${row.timestamp}`);
          console.log(`  Page URL: ${row.page_url}`);
          console.log(`  UTM Source: "${row.utm_source}"`);
          console.log(`  UTM Medium: "${row.utm_medium}"`);
          console.log(`  UTM Campaign: "${row.utm_campaign}"`);
          console.log(`  Referrer: ${row.referrer || '(none)'}`);
        });
        console.log('\n');
      }
    } catch (err) {
      console.log('No records with problematic values found.\n');
    }

    console.log('✅ Investigation complete!\n');
    console.log('Next steps:');
    console.log('1. Review the problematic UTM combinations above');
    console.log('2. Determine the correct source/medium values for each');
    console.log('3. Run the fix script to update the records\n');

  } catch (error) {
    console.error('❌ Error during investigation:', error);
    throw error;
  } finally {
    await clickhouse.close();
  }
}

// Run the investigation
investigateUTMData().catch((error) => {
  console.error('Failed to complete investigation:', error);
  process.exit(1);
});

