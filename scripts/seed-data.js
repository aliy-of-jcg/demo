const { createClient } = require('@clickhouse/client');
const { nanoid } = require('nanoid');

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

async function seedData() {
  console.log('🌱 Seeding initial tracking data...\n');

  try {
    const seedEvents = [
      {
        id: nanoid(),
        tracking_code: nanoid(10),
        campaign_name: 'Initial Test - Telegram',
        utm_source: 'telegram',
        utm_medium: 'social',
        utm_campaign: 'test_campaign',
        utm_content: 'seed_data',
        utm_term: '',
        referrer: 'https://telegram.org',
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        device_type: 'Desktop',
        browser: 'Chrome',
        os: 'Windows 10',
        country: 'South Korea',
        city: 'Seoul',
      },
      {
        id: nanoid(),
        tracking_code: nanoid(10),
        campaign_name: 'Initial Test - Kakao',
        utm_source: 'kakao',
        utm_medium: 'social',
        utm_campaign: 'test_campaign',
        utm_content: 'seed_data',
        utm_term: '',
        referrer: 'https://www.kakaocorp.com',
        ip_address: '127.0.0.2',
        user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        device_type: 'Mobile',
        browser: 'Safari',
        os: 'iOS',
        country: 'South Korea',
        city: 'Busan',
      },
      {
        id: nanoid(),
        tracking_code: nanoid(10),
        campaign_name: 'Initial Test - Naver',
        utm_source: 'naver',
        utm_medium: 'cpc',
        utm_campaign: 'test_campaign',
        utm_content: 'seed_data',
        utm_term: '',
        referrer: 'https://www.naver.com',
        ip_address: '127.0.0.3',
        user_agent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B)',
        device_type: 'Mobile',
        browser: 'Chrome',
        os: 'Android',
        country: 'South Korea',
        city: 'Incheon',
      },
      {
        id: nanoid(),
        tracking_code: nanoid(10),
        campaign_name: 'Initial Test - Google',
        utm_source: 'google',
        utm_medium: 'organic',
        utm_campaign: 'test_campaign',
        utm_content: 'seed_data',
        utm_term: '',
        referrer: 'https://www.google.com',
        ip_address: '127.0.0.4',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        device_type: 'Desktop',
        browser: 'Chrome',
        os: 'Windows 10',
        country: 'South Korea',
        city: 'Seoul',
      },
    ];

    console.log('Adding seed events to tracking_events table...');
    await clickhouse.insert({
      table: 'analytics.tracking_events',
      values: seedEvents,
      format: 'JSONEachRow',
    });
    console.log('✅ Added 4 seed events (Telegram, Kakao, Naver, Google)\n');

    console.log('Verifying data...');
    const result = await clickhouse.query({
      query: `
        SELECT 
          utm_source,
          count() as clicks
        FROM analytics.tracking_events
        GROUP BY utm_source
        ORDER BY clicks DESC
      `,
      format: 'JSONEachRow',
    });

    const data = await result.json();
    console.log('📊 Current traffic sources:');
    console.table(data);

    console.log('\n✨ Seed data added successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Start your Next.js app: npm run dev');
    console.log('2. Open http://localhost:3000');
    console.log('3. See the initial data in the dashboard');
    console.log('4. Generate a tracking link and test it!');
    
    await clickhouse.close();
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    console.log('\n💡 Tip: Make sure ClickHouse is running:');
    console.log('   docker-compose up -d');
    console.log('   node scripts/init-clickhouse.js');
    process.exit(1);
  }
}

seedData();

