const mysql = require('mysql2/promise');
require('dotenv').config();

async function addBudgetFields() {
  console.log('🔧 Adding budget tracking fields to utm_codes table...');

  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'appuser',
      password: process.env.MYSQL_PASSWORD || 'apppassword',
      database: process.env.MYSQL_DATABASE || 'appdb'
    });

    console.log('✅ Connected to MySQL');

    // Check if columns already exist
    const [budgetColumn] = await connection.execute(`
      SHOW COLUMNS FROM utm_codes LIKE 'budget'
    `);
    
    const [spentColumn] = await connection.execute(`
      SHOW COLUMNS FROM utm_codes LIKE 'spent'
    `);
    
    const [autoPauseColumn] = await connection.execute(`
      SHOW COLUMNS FROM utm_codes LIKE 'auto_pause_on_budget'
    `);

    if (budgetColumn.length > 0 && spentColumn.length > 0 && autoPauseColumn.length > 0) {
      console.log('ℹ️  Budget tracking columns already exist');
      await connection.end();
      return;
    }

    // Add budget column if it doesn't exist
    if (budgetColumn.length === 0) {
      await connection.execute(`
        ALTER TABLE utm_codes 
        ADD COLUMN budget DECIMAL(12,2) DEFAULT NULL COMMENT 'Budget allocation for this tracking link (NULL = no limit)'
      `);
      console.log('✅ Added budget column');
    }

    // Add spent column if it doesn't exist
    if (spentColumn.length === 0) {
      await connection.execute(`
        ALTER TABLE utm_codes 
        ADD COLUMN spent DECIMAL(12,2) DEFAULT 0 COMMENT 'Amount spent through this tracking link'
      `);
      console.log('✅ Added spent column');
    }

    // Add auto_pause_on_budget column if it doesn't exist
    if (autoPauseColumn.length === 0) {
      await connection.execute(`
        ALTER TABLE utm_codes 
        ADD COLUMN auto_pause_on_budget BOOLEAN DEFAULT FALSE COMMENT 'Auto-pause link when budget is reached'
      `);
      console.log('✅ Added auto_pause_on_budget column');
    }

    await connection.end();
    console.log('✅ Migration completed successfully');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

addBudgetFields()
  .then(() => {
    console.log('\n✅ Budget tracking fields added successfully!');
    console.log('📊 You can now allocate budgets to individual tracking links.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

