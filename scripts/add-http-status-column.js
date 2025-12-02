const { createClient } = require('@clickhouse/client');

try {
    require('dotenv').config();
} catch (e) {
    console.log('ℹ️  dotenv not found, using default values\n');
}

const clickhouse = createClient({
    url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
    database: 'default',
    username: process.env.CLICKHOUSE_USER || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || '',
});

async function addHttpStatusColumn() {
    console.log('🔄 Adding http_status column to visit_logs table...\n');

    try {
        // Add http_status column (defaults to 200 for existing records)
        await clickhouse.command({
            query: `
        ALTER TABLE analytics.visit_logs
        ADD COLUMN IF NOT EXISTS http_status Int32 DEFAULT 200
      `,
        });

        console.log('✅ Column http_status added successfully\n');
        console.log('📝 Note: Existing records will have http_status = 200 (default)\n');

        await clickhouse.close();
    } catch (error) {
        console.error('❌ Error adding column:', error);
        process.exit(1);
    }
}

addHttpStatusColumn();

