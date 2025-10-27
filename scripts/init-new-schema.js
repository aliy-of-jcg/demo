const mysql = require('mysql2/promise');
const clickhouse = require('@clickhouse/client');

async function initNewSchema() {
  console.log('🏗️  Creating new database schema...');
  
  // MySQL Schema
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'appuser',
      password: process.env.MYSQL_PASSWORD || 'apppassword',
      database: process.env.MYSQL_DATABASE || 'appdb'
    });

    console.log('📊 Creating MySQL tables...');
    
    // Create courses table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS courses (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) UNIQUE,
        category VARCHAR(100),
        duration VARCHAR(50),
        price DECIMAL(10,2),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created table: courses');

    // Create campaigns table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        course_id INT,
        source VARCHAR(50),
        medium VARCHAR(50),
        status VARCHAR(20) DEFAULT 'waiting',
        start_date DATE,
        end_date DATE,
        budget DECIMAL(12,2),
        spent DECIMAL(12,2) DEFAULT 0,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id)
      )
    `);
    console.log('✅ Created table: campaigns');

    // Create utm_codes table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS utm_codes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255),
        campaign_id INT,
        tracking_code VARCHAR(20),
        utm_campaign VARCHAR(255),
        utm_source VARCHAR(100),
        utm_medium VARCHAR(100),
        utm_term VARCHAR(255),
        utm_content VARCHAR(255),
        landing_url TEXT,
        full_url TEXT,
        clicks INT DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
        UNIQUE KEY unique_tracking_code (tracking_code)
      )
    `);
    console.log('✅ Created table: utm_codes');

    await connection.end();
    console.log('✅ MySQL schema created successfully');
  } catch (error) {
    console.error('❌ MySQL schema creation failed:', error.message);
    throw error;
  }

  // ClickHouse Schema
  try {
    const client = clickhouse.createClient({
      url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
      username: process.env.CLICKHOUSE_USER || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || '',
      database: process.env.CLICKHOUSE_DATABASE || 'analytics'
    });

    console.log('📊 Creating ClickHouse tables...');
    
    // Create visit_logs table
    await client.command({
      query: `
      CREATE TABLE IF NOT EXISTS visit_logs (
        timestamp DateTime,
        session_id String,
        user_id String,
        page_url String,
        page_title String,
        referrer String,
        utm_source String,
        utm_medium String,
        utm_campaign String,
        utm_term String,
        utm_content String,
        campaign_id Int32,
        course_id Int32,
        user_agent String,
        device_type String,
        os String,
        browser String,
        screen_resolution String,
        visit_count Int32,
        is_new_visitor UInt8,
        time_on_page Int32,
        event_type String
      ) ENGINE = MergeTree()
      ORDER BY (timestamp, session_id, user_id)
      `
    });
    console.log('✅ Created table: visit_logs');

    // Create tracking_events table
    await client.command({
      query: `
      CREATE TABLE IF NOT EXISTS tracking_events (
        id String,
        tracking_code String,
        campaign_name String,
        utm_source String,
        utm_medium String,
        utm_campaign String,
        utm_content String,
        utm_term String,
        referrer String,
        referrer_domain String,
        referrer_source String,
        referrer_is_known UInt8,
        ip_address String,
        user_agent String,
        device_type String,
        device_vendor String,
        device_model String,
        browser String,
        browser_version String,
        os String,
        os_version String,
        engine String,
        is_mobile_app UInt8,
        app_name String,
        is_bot UInt8,
        country String,
        city String,
        region String,
        timezone String,
        created_at DateTime DEFAULT now()
      ) ENGINE = MergeTree()
      ORDER BY (tracking_code, created_at)
      `
    });
    console.log('✅ Created table: tracking_events');

    await client.close();
    console.log('✅ ClickHouse schema created successfully');
  } catch (error) {
    console.error('❌ ClickHouse schema creation failed:', error.message);
    throw error;
  }

  console.log('🎉 New database schema created successfully!');
}

// Run if called directly
if (require.main === module) {
  initNewSchema().catch(console.error);
}

module.exports = { initNewSchema };
