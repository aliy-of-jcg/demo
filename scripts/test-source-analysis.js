/**
 * Script to test source analysis query
 * This simulates what the /api/analytics/source-analysis endpoint returns
 */

const { createClient } = require('@clickhouse/client');

const clickhouse = createClient({
  url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  database: process.env.CLICKHOUSE_DATABASE || 'analytics',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
});

async function testSourceAnalysis() {
  console.log('🧪 Testing Source Analysis Query\n');
  console.log('This shows what the source-analysis page will display:\n');

  try {
    // Use the exact same query from the source-analysis API
    const sourceMediaQuery = `
      SELECT 
        CASE 
          WHEN utm_source = '' THEN 'Direct'
          ELSE utm_source
        END as source,
        CASE 
          WHEN utm_medium = '' THEN '(not set)'
          ELSE utm_medium
        END as medium,
        COUNT(DISTINCT user_id) as visitors,
        SUM(CASE WHEN event_type = 'conversion' THEN 1 ELSE 0 END) as conversions,
        SUM(CASE WHEN event_type = 'conversion' THEN 1 ELSE 0 END) * 100.0 / COUNT(DISTINCT user_id) as conversion_rate
      FROM analytics.visit_logs
      WHERE toDate(timestamp) BETWEEN toDate(date_sub(MONTH, 1, now())) AND toDate(now())
      GROUP BY source, medium
      ORDER BY visitors DESC
    `;

    const result = await clickhouse.query({
      query: sourceMediaQuery,
      format: 'JSONEachRow'
    });

    const data = await result.json();

    console.log('Source Analysis Results:');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('Source'.padEnd(20), 'Medium'.padEnd(20), 'Visitors', 'Conv.', 'Rate');
    console.log('───────────────────────────────────────────────────────────────────────────────');

    if (data.length === 0) {
      console.log('No data found for the selected period.\n');
    } else {
      data.forEach((row, idx) => {
        const convRate = parseFloat(row.conversion_rate || 0).toFixed(2);
        console.log(
          `${idx + 1}. ${row.source.padEnd(17)}`,
          row.medium.padEnd(20),
          String(row.visitors).padEnd(8),
          String(row.conversions).padEnd(6),
          `${convRate}%`
        );
      });
    }

    console.log('\n');
    console.log('✅ This is what will appear in the source analysis page!');
    console.log('   - "Direct / (not set)" = Direct traffic (no UTM parameters)');
    console.log('   - "kakao / sns" = Kakao SNS campaign traffic');
    console.log('   - "google / video" = Google Video campaign traffic\n');

  } catch (error) {
    console.error('❌ Error during test:', error);
    throw error;
  } finally {
    await clickhouse.close();
  }
}

// Run the test
testSourceAnalysis().catch((error) => {
  console.error('Failed to complete test:', error);
  process.exit(1);
});

