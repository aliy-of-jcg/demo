const { createClient } = require('@clickhouse/client');
const readline = require('readline');
require('dotenv').config({ path: '.env.local' });

const clickhouse = createClient({
  url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  database: process.env.CLICKHOUSE_DATABASE || 'analytics',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
});

// Helper function to ask for confirmation
async function confirm(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    rl.question(`${message} (yes/no): `, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

async function cleanDatabase() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('⚠️  CLICKHOUSE DATABASE CLEANUP');
    console.log('='.repeat(60));
    console.log('\n⚠️  WARNING: This will DELETE ALL DATA from ClickHouse!');
    console.log('⚠️  This action CANNOT be undone!\n');
    console.log('📊 Tables that will be dropped:');
    console.log('   - analytics.tracking_events (all click data)');
    console.log('   - analytics.tracking_codes (all tracking links)');
    console.log('\n💡 Tip: After cleaning, run "npm run clickhouse:init" to recreate tables.\n');

    // Ask for confirmation
    const confirmed = await confirm('⚠️  Are you absolutely sure you want to delete all data?');
    
    if (!confirmed) {
      console.log('\n❌ Operation cancelled. No data was deleted.');
      await clickhouse.close();
      process.exit(0);
    }

    // Double confirmation for safety
    console.log('\n⚠️  Last chance! Type "DELETE" to confirm:');
    const finalConfirm = await new Promise(resolve => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.question('> ', answer => {
        rl.close();
        resolve(answer === 'DELETE');
      });
    });

    if (!finalConfirm) {
      console.log('\n❌ Operation cancelled. No data was deleted.');
      await clickhouse.close();
      process.exit(0);
    }

    console.log('\n🔄 Starting cleanup...\n');

    // Drop tracking_events table
    console.log('🗑️  Dropping analytics.tracking_events...');
    await clickhouse.command({
      query: `DROP TABLE IF EXISTS analytics.tracking_events`,
    });
    console.log('✅ tracking_events dropped');

    // Drop tracking_codes table
    console.log('🗑️  Dropping analytics.tracking_codes...');
    await clickhouse.command({
      query: `DROP TABLE IF EXISTS analytics.tracking_codes`,
    });
    console.log('✅ tracking_codes dropped');

    console.log('\n✨ Cleanup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Run "npm run clickhouse:init" to recreate tables');
    console.log('   2. Or manually create your custom schema');
    console.log('   3. Run "npm run dev" to start your application\n');

    await clickhouse.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
    await clickhouse.close();
    process.exit(1);
  }
}

cleanDatabase();

