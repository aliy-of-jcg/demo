const mysql = require('mysql2/promise');
const clickhouse = require('@clickhouse/client');

async function dropAllTables() {
  console.log('🗑️  Starting database cleanup...');
  
  // MySQL cleanup
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'appuser',
      password: process.env.MYSQL_PASSWORD || 'apppassword',
      database: process.env.MYSQL_DATABASE || 'appdb'
    });

    console.log('📊 Dropping MySQL tables...');
    
    // Drop existing tables (except users) - in correct order for foreign keys
    const tablesToDrop = [
      'utm_codes',      // Drop first (has FK to campaigns)
      'campaigns',      // Drop second (has FK to courses)
      'courses',        // Drop third
      'tracking_links',
      'analytics'
    ];

    for (const table of tablesToDrop) {
      try {
        await connection.execute(`DROP TABLE IF EXISTS ${table}`);
        console.log(`✅ Dropped table: ${table}`);
      } catch (error) {
        console.log(`⚠️  Table ${table} may not exist:`, error.message);
      }
    }

    await connection.end();
    console.log('✅ MySQL cleanup completed');
  } catch (error) {
    console.error('❌ MySQL cleanup failed:', error.message);
  }

  // ClickHouse cleanup
  try {
    const client = clickhouse.createClient({
      url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
      username: process.env.CLICKHOUSE_USER || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || '',
      database: process.env.CLICKHOUSE_DATABASE || 'analytics'
    });

    console.log('📊 Dropping ClickHouse tables...');
    
    const tablesToDrop = [
      'analytics',
      'tracking_events',
      'tracking_codes',
      'visit_logs'
    ];

    for (const table of tablesToDrop) {
      try {
        await client.command(`DROP TABLE IF EXISTS ${table}`);
        console.log(`✅ Dropped table: ${table}`);
      } catch (error) {
        console.log(`⚠️  Table ${table} may not exist:`, error.message);
      }
    }

    await client.close();
    console.log('✅ ClickHouse cleanup completed');
  } catch (error) {
    console.error('❌ ClickHouse cleanup failed:', error.message);
  }

  console.log('🎉 Database cleanup completed!');
}

// Run if called directly
if (require.main === module) {
  dropAllTables().catch(console.error);
}

module.exports = { dropAllTables };
