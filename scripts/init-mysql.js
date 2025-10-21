const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const config = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'appuser',
  password: process.env.MYSQL_PASSWORD || 'apppassword',
  database: process.env.MYSQL_DATABASE || 'appdb',
  multipleStatements: true,
};

async function initDatabase() {
  let connection;
  
  try {
    console.log('🔌 Connecting to MySQL...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to MySQL');

    // Read and execute schema file
    const schemaPath = path.join(__dirname, 'init-mysql.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📝 Creating database schema...');
    await connection.query(schema);
    console.log('✅ Database schema created successfully');

    // Verify tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log('\n📊 Tables created:');
    tables.forEach(table => {
      console.log(`  - ${Object.values(table)[0]}`);
    });

    console.log('\n✨ MySQL database initialized successfully!');
    console.log('\n📝 Note: The first registered user will be type "regular".');
    console.log('   You can manually change them to "owner" via database.\n');
  } catch (error) {
    console.error('❌ Error initializing MySQL database:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();

