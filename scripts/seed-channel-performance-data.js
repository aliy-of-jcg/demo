/**
 * Seed Channel Performance Data for Testing
 * 
 * This script generates realistic visit and conversion data for existing campaigns
 * to test the channel-performance page with meaningful chart data.
 * 
 * Usage: node scripts/seed-channel-performance-data.js
 */

const mysql = require('mysql2/promise');
const { createClient } = require('@clickhouse/client');

const clickhouse = createClient({
  url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  database: process.env.CLICKHOUSE_DATABASE || 'analytics',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
});

// Configuration
const CONFIG = {
  visitsPerCampaign: { min: 30, max: 150 },      // Visits per campaign
  conversionRate: { min: 0.02, max: 0.08 },     // 2-8% conversion rate
  daysBack: 30,                                  // Generate data for last 30 days
  costPerClick: 0.50,                            // $0.50 per click (as you mentioned)
  clickToVisitRate: 0.70,                        // 70% of clicks become visits
};

// Helper functions
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function getRandomDate(daysBack) {
  const now = new Date();
  const past = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
  const randomTime = past.getTime() + Math.random() * (now.getTime() - past.getTime());
  return Math.floor(randomTime / 1000); // Unix timestamp
}

function getRandomDeviceType() {
  const types = ['desktop', 'mobile', 'tablet'];
  const weights = [0.5, 0.4, 0.1]; // 50% desktop, 40% mobile, 10% tablet
  const random = Math.random();
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += weights[i];
    if (random <= sum) return types[i];
  }
  return types[0];
}

function getRandomBrowser() {
  const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge'];
  return browsers[Math.floor(Math.random() * browsers.length)];
}

function getRandomOS() {
  const os = ['Windows', 'macOS', 'iOS', 'Android', 'Linux'];
  return os[Math.floor(Math.random() * os.length)];
}

async function seedChannelPerformanceData() {
  console.log('🌱 Seeding Channel Performance Data...\n');

  let connection;
  
  try {
    // Connect to MySQL
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'appuser',
      password: process.env.MYSQL_PASSWORD || 'apppassword',
      database: process.env.MYSQL_DATABASE || 'appdb'
    });

    // Step 1: Get all active campaigns
    console.log('📋 Step 1: Fetching campaigns...');
    const [campaigns] = await connection.execute(`
      SELECT 
        id,
        name,
        source,
        medium,
        start_date,
        end_date,
        spent
      FROM campaigns
      WHERE status IN ('active', 'waiting')
      ORDER BY source, name
    `);

    const campaignList = campaigns;

    if (campaignList.length === 0) {
      console.log('❌ No campaigns found. Please create some campaigns first.\n');
      await clickhouse.close();
      return;
    }

    console.log(`✅ Found ${campaignList.length} campaigns\n`);

    // Step 2: Generate visit data for each campaign
    console.log('📊 Step 2: Generating visit and conversion data...\n');

    let totalVisits = 0;
    let totalConversions = 0;
    let totalClicks = 0;

    for (const campaign of campaignList) {
      const visitsCount = randomInt(CONFIG.visitsPerCampaign.min, CONFIG.visitsPerCampaign.max);
      const convRate = randomFloat(CONFIG.conversionRate.min, CONFIG.conversionRate.max);
      const conversionsCount = Math.floor(visitsCount * convRate);
      
      // Calculate clicks (visits / click-to-visit rate)
      const clicks = Math.floor(visitsCount / CONFIG.clickToVisitRate);
      totalClicks += clicks;

      console.log(`📦 ${campaign.name} (${campaign.source}/${campaign.medium})`);
      console.log(`   Generating: ${visitsCount} visits, ${conversionsCount} conversions (${(convRate * 100).toFixed(1)}% rate)`);

      const events = [];

      // Generate visit events
      for (let i = 0; i < visitsCount; i++) {
        const userId = generateUUID();
        const sessionId = generateUUID();
        const timestamp = getRandomDate(CONFIG.daysBack);
        const isConversion = i < conversionsCount; // First N visits are conversions

        // Pageview event
        events.push({
          timestamp: timestamp,
          session_id: sessionId,
          user_id: userId,
          campaign_id: campaign.id,
          course_id: 0, // Will be set from campaign if needed
          page_url: `https://aptdecor.uz/campaign-landing?c=${campaign.id}`,
          page_title: `${campaign.name} Landing Page`,
          referrer: '',
          utm_source: campaign.source,
          utm_medium: campaign.medium,
          utm_campaign: campaign.name.toLowerCase().replace(/\s+/g, '_'),
          utm_term: '',
          utm_content: '',
          user_agent: 'Mozilla/5.0 (Test Data Generator)',
          device_type: getRandomDeviceType(),
          os: getRandomOS(),
          browser: getRandomBrowser(),
          screen_resolution: '1920x1080',
          visit_count: 1,
          is_new_visitor: 1,
          time_on_page: randomInt(30, 300),
          event_type: 'pageview',
          page_sequence: 1,
          is_landing_page: 1,
          is_exit_page: 0,
          previous_page_url: ''
        });

        // Add conversion event if this is a conversion visit
        if (isConversion) {
          events.push({
            timestamp: timestamp + randomInt(60, 300), // Conversion 1-5 min after visit
            session_id: sessionId,
            user_id: userId,
            campaign_id: campaign.id,
            course_id: 0,
            page_url: `https://aptdecor.uz/thank-you`,
            page_title: 'Thank You - Conversion',
            referrer: `https://aptdecor.uz/campaign-landing?c=${campaign.id}`,
            utm_source: campaign.source,
            utm_medium: campaign.medium,
            utm_campaign: campaign.name.toLowerCase().replace(/\s+/g, '_'),
            utm_term: '',
            utm_content: '',
            user_agent: 'Mozilla/5.0 (Test Data Generator)',
            device_type: getRandomDeviceType(),
            os: getRandomOS(),
            browser: getRandomBrowser(),
            screen_resolution: '1920x1080',
            visit_count: 1,
            is_new_visitor: 1,
            time_on_page: randomInt(10, 60),
            event_type: 'conversion',
            page_sequence: 2,
            is_landing_page: 0,
            is_exit_page: 1,
            previous_page_url: `https://aptdecor.uz/campaign-landing?c=${campaign.id}`
          });
        }
      }

      // Insert events in batches
      const batchSize = 100;
      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        await clickhouse.insert({
          table: 'analytics.visit_logs',
          values: batch,
          format: 'JSONEachRow'
        });
      }

      totalVisits += visitsCount;
      totalConversions += conversionsCount;

      // Update campaign clicks in utm_codes table (for CTR calculation)
      await connection.execute(`
        UPDATE utm_codes 
        SET clicks = clicks + ?
        WHERE campaign_id = ?
        LIMIT 1
      `, [clicks, campaign.id]);

      console.log(`   ✅ Inserted ${events.length} events (${visitsCount} visits + ${conversionsCount} conversions)\n`);
    }

    // Close MySQL connection
    if (connection) {
      await connection.end();
    }

    // Step 3: Summary
    const totalAdCost = totalClicks * CONFIG.costPerClick;
    const avgConversionRate = totalVisits > 0 ? (totalConversions / totalVisits * 100) : 0;
    const costPerConversion = totalConversions > 0 ? (totalAdCost / totalConversions) : 0;

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ SEEDING COMPLETE!\n');
    console.log('📊 Summary:');
    console.log(`   Total Campaigns: ${campaignList.length}`);
    console.log(`   Total Visits: ${totalVisits.toLocaleString()}`);
    console.log(`   Total Conversions: ${totalConversions}`);
    console.log(`   Average Conversion Rate: ${avgConversionRate.toFixed(2)}%`);
    console.log(`   Total Clicks: ${totalClicks.toLocaleString()}`);
    console.log(`   Total Ad Cost: $${totalAdCost.toLocaleString()} (at $${CONFIG.costPerClick}/click)`);
    console.log(`   Cost Per Conversion: $${costPerConversion.toFixed(2)}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('🎉 Channel Performance data is ready!');
    console.log('🌐 View the page at: http://localhost:3000/channel-performance\n');

    console.log('💡 Tips:');
    console.log('   - The chart should now show bars for each channel');
    console.log('   - Each channel section will display campaign tables');
    console.log('   - Try different date ranges to filter the data');
    console.log('   - Conversion rates vary between 2-8% for realistic testing\n');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await clickhouse.close();
  }
}

// Run the seeding
seedChannelPerformanceData().catch((error) => {
  console.error('Failed to seed data:', error);
  process.exit(1);
});

