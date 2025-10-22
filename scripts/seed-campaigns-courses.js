const mysql = require('mysql2/promise');
const clickhouse = require('@clickhouse/client');
const { nanoid } = require('nanoid');

async function seedData() {
  console.log('🌱 Seeding database with sample data...');
  
  // MySQL seeding
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'appuser',
      password: process.env.MYSQL_PASSWORD || 'apppassword',
      database: process.env.MYSQL_DATABASE || 'appdb'
    });

    console.log('📊 Seeding MySQL tables...');
    
    // Seed courses
    const courses = [
      { name: 'AI 실무 활용 과정', code: 'AI2025', category: 'IT/기술', duration: '3개월', price: 1200000, status: 'active' },
      { name: '디지털 마케팅 전문가', code: 'MKT2025', category: '마케팅', duration: '2개월', price: 980000, status: 'active' },
      { name: '리더십 아카데미', code: 'LEAD2025', category: '경영/관리', duration: '4개월', price: 1500000, status: 'active' },
      { name: '데이터 분석 입문', code: 'DATA2025', category: 'IT/기술', duration: '2개월', price: 850000, status: 'active' },
      { name: 'Python 기초', code: 'PY2025', category: 'IT/기술', duration: '1개월', price: 500000, status: 'active' }
    ];

    for (const course of courses) {
      await connection.execute(
        'INSERT INTO courses (name, code, category, duration, price, status) VALUES (?, ?, ?, ?, ?, ?)',
        [course.name, course.code, course.category, course.duration, course.price, course.status]
      );
    }
    console.log('✅ Seeded courses table');

    // Get course IDs for campaigns
    const [courseRows] = await connection.execute('SELECT id, name FROM courses');
    const courseMap = {};
    courseRows.forEach(row => {
      courseMap[row.name] = row.id;
    });

    // Seed campaigns
    const campaigns = [
      { 
        name: '2501_ai_education', 
        course_id: courseMap['AI 실무 활용 과정'], 
        source: 'naver', 
        medium: 'search', 
        status: 'active', 
        start_date: '2025-01-01', 
        end_date: '2025-03-31', 
        budget: 5000000, 
        spent: 2500000,
        description: 'AI 교육과정 홍보 캠페인'
      },
      { 
        name: '2501_digital_marketing', 
        course_id: courseMap['디지털 마케팅 전문가'], 
        source: 'kakao', 
        medium: 'banner', 
        status: 'active', 
        start_date: '2025-01-15', 
        end_date: '2025-02-28', 
        budget: 3000000, 
        spent: 1800000,
        description: '디지털 마케팅 과정 홍보'
      },
      { 
        name: '2501_leadership_academy', 
        course_id: courseMap['리더십 아카데미'], 
        source: 'google', 
        medium: 'search', 
        status: 'waiting', 
        start_date: '2025-02-01', 
        end_date: '2025-05-31', 
        budget: 4000000, 
        spent: 0,
        description: '리더십 아카데미 홍보'
      },
      { 
        name: '2501_data_analysis', 
        course_id: courseMap['데이터 분석 입문'], 
        source: 'youtube', 
        medium: 'video', 
        status: 'active', 
        start_date: '2025-01-10', 
        end_date: '2025-03-10', 
        budget: 2500000, 
        spent: 1200000,
        description: '데이터 분석 과정 홍보'
      },
      { 
        name: '2501_python_basics', 
        course_id: courseMap['Python 기초'], 
        source: 'saramin', 
        medium: 'banner', 
        status: 'ended', 
        start_date: '2024-12-01', 
        end_date: '2024-12-31', 
        budget: 1500000, 
        spent: 1500000,
        description: 'Python 기초 과정 홍보'
      }
    ];

    for (const campaign of campaigns) {
      await connection.execute(
        'INSERT INTO campaigns (name, course_id, source, medium, status, start_date, end_date, budget, spent, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [campaign.name, campaign.course_id, campaign.source, campaign.medium, campaign.status, campaign.start_date, campaign.end_date, campaign.budget, campaign.spent, campaign.description]
      );
    }
    console.log('✅ Seeded campaigns table');

    // Get campaign IDs for UTM codes
    const [campaignRows] = await connection.execute('SELECT id, name FROM campaigns');
    const campaignMap = {};
    campaignRows.forEach(row => {
      campaignMap[row.name] = row.id;
    });

    // Seed UTM codes
    const utmCodes = [
      {
        name: 'AI Education Campaign',
        campaign_id: campaignMap['2501_ai_education'],
        utm_campaign: 'ai_education_2025',
        utm_source: 'naver',
        utm_medium: 'search',
        utm_term: 'ai education',
        utm_content: 'banner_ad',
        landing_url: 'https://example.com/ai-course',
        full_url: 'https://example.com/ai-course?utm_source=naver&utm_medium=search&utm_campaign=ai_education_2025',
        clicks: 1240
      },
      {
        name: 'Digital Marketing Campaign',
        campaign_id: campaignMap['2501_digital_marketing'],
        utm_campaign: 'digital_marketing_2025',
        utm_source: 'kakao',
        utm_medium: 'banner',
        utm_term: 'digital marketing',
        utm_content: 'sidebar_ad',
        landing_url: 'https://example.com/marketing-course',
        full_url: 'https://example.com/marketing-course?utm_source=kakao&utm_medium=banner&utm_campaign=digital_marketing_2025',
        clicks: 820
      }
    ];

    for (const utm of utmCodes) {
      await connection.execute(
        'INSERT INTO utm_codes (name, campaign_id, utm_campaign, utm_source, utm_medium, utm_term, utm_content, landing_url, full_url, clicks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [utm.name, utm.campaign_id, utm.utm_campaign, utm.utm_source, utm.utm_medium, utm.utm_term, utm.utm_content, utm.landing_url, utm.full_url, utm.clicks]
      );
    }
    console.log('✅ Seeded utm_codes table');

    await connection.end();
    console.log('✅ MySQL seeding completed');
  } catch (error) {
    console.error('❌ MySQL seeding failed:', error.message);
    throw error;
  }

  // ClickHouse seeding
  try {
    const client = clickhouse.createClient({
      url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
      username: process.env.CLICKHOUSE_USER || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || '',
      database: process.env.CLICKHOUSE_DATABASE || 'analytics'
    });

    console.log('📊 Seeding ClickHouse tables...');
    
    // Generate sample visit logs
    const visitLogs = [];
    const sources = ['naver', 'kakao', 'google', 'youtube', 'saramin'];
    const devices = ['Mobile', 'Desktop', 'Tablet'];
    const browsers = ['Chrome', 'Safari', 'Edge', 'Firefox'];
    const os = ['Android', 'iOS', 'Windows', 'macOS'];
    
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-01-31');
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayVisits = Math.floor(Math.random() * 200) + 50; // 50-250 visits per day
      
      for (let i = 0; i < dayVisits; i++) {
        const timestamp = new Date(d);
        timestamp.setHours(Math.floor(Math.random() * 24));
        timestamp.setMinutes(Math.floor(Math.random() * 60));
        
        const source = sources[Math.floor(Math.random() * sources.length)];
        const device = devices[Math.floor(Math.random() * devices.length)];
        const browser = browsers[Math.floor(Math.random() * browsers.length)];
        const osName = os[Math.floor(Math.random() * os.length)];
        
        // Demo conversion logic: 3-5% conversion rate
        const isConversion = Math.random() < 0.04; // 4% conversion rate
        
        visitLogs.push({
          timestamp: timestamp.toISOString().slice(0, 19).replace('T', ' '),
          session_id: nanoid(10),
          user_id: nanoid(10),
          page_url: '/course/ai-basics',
          page_title: 'AI Basics Course',
          referrer: 'https://naver.com',
          utm_source: source,
          utm_medium: 'search',
          utm_campaign: 'ai_education_2025',
          utm_term: 'ai education',
          utm_content: 'banner_ad',
          campaign_id: 1,
          course_id: 1,
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          device_type: device,
          os: osName,
          browser: browser,
          screen_resolution: '1920x1080',
          visit_count: Math.floor(Math.random() * 5) + 1,
          is_new_visitor: Math.random() < 0.3 ? 1 : 0,
          time_on_page: Math.floor(Math.random() * 300) + 30,
          event_type: isConversion ? 'conversion' : 'pageview'
        });
      }
    }

    // Insert in batches
    const batchSize = 1000;
    for (let i = 0; i < visitLogs.length; i += batchSize) {
      const batch = visitLogs.slice(i, i + batchSize);
      await client.insert({
        table: 'visit_logs',
        values: batch,
        format: 'JSONEachRow'
      });
    }
    
    console.log(`✅ Seeded ${visitLogs.length} visit logs`);

    await client.close();
    console.log('✅ ClickHouse seeding completed');
  } catch (error) {
    console.error('❌ ClickHouse seeding failed:', error.message);
    throw error;
  }

  console.log('🎉 Database seeding completed successfully!');
}

// Run if called directly
if (require.main === module) {
  seedData().catch(console.error);
}

module.exports = { seedData };
