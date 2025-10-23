const mysql = require('mysql2/promise');
require('dotenv').config();

async function addTrackingCodeColumn() {
  console.log('🔧 Adding tracking_code column to utm_codes table...');

  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'appuser',
      password: process.env.MYSQL_PASSWORD || 'apppassword',
      database: process.env.MYSQL_DATABASE || 'appdb'
    });

    console.log('✅ Connected to MySQL');

    // Check if column already exists
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM utm_codes LIKE 'tracking_code'
    `);

    if (columns.length > 0) {
      console.log('ℹ️  tracking_code column already exists');
      await connection.end();
      return;
    }

    // Add tracking_code column
    await connection.execute(`
      ALTER TABLE utm_codes 
      ADD COLUMN tracking_code VARCHAR(20) AFTER campaign_id,
      ADD UNIQUE KEY unique_tracking_code (tracking_code)
    `);

    console.log('✅ tracking_code column added successfully');

    await connection.end();
    console.log('✅ Migration completed');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

addTrackingCodeColumn()
  .then(() => {
    console.log('\n✅ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

