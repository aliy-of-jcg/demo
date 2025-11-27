# Phase 1 ClickHouse Migration Guide

This guide walks you through migrating your ClickHouse `visit_logs` table to use partitioning and projections for better performance.

## What This Migration Does

1. **Adds Partitioning**: Splits `visit_logs` table by month for faster date-range queries
2. **Adds Projections**: Pre-aggregates common query patterns for instant results
3. **Zero Downtime**: Uses table swapping to minimize disruption
4. **Backward Compatible**: All existing queries continue to work

## Prerequisites

- ClickHouse server running and accessible
- Sufficient disk space (you'll temporarily have 2x the table size)
- Backup of your ClickHouse data (recommended)

## Migration Options

You have two ways to run the migration:

### Option 1: SQL Script (Recommended for Production)

Run the SQL commands directly in ClickHouse:

```bash
# Connect to ClickHouse
clickhouse-client

# Or if using Docker
docker exec -it clickhouse clickhouse-client

# Then run:
source scripts/migrate-clickhouse-phase1.sql
```

Or copy-paste the SQL commands from `scripts/migrate-clickhouse-phase1.sql` one by one.

### Option 2: Node.js Script

Run the automated Node.js script:

```bash
# Set environment variables (if needed)
export CLICKHOUSE_HOST=http://localhost:8123
export CLICKHOUSE_DATABASE=analytics
export CLICKHOUSE_USER=default
export CLICKHOUSE_PASSWORD=

# Run the migration
node scripts/migrate-clickhouse-phase1.js
```

## Migration Steps Overview

1. **Create new partitioned table** (`visit_logs_new`)
2. **Copy all data** from old table to new table
3. **Verify data integrity** (row counts match)
4. **Swap tables** (atomic operation - old becomes `visit_logs_old`)
5. **Add projections** for common query patterns
6. **Materialize projections** (populate with existing data)
7. **Verify everything works**
8. **Cleanup** (drop `visit_logs_old` after 24-48 hours)

## Running on Both Environments

### Local Development

```bash
# Option 1: SQL
clickhouse-client < scripts/migrate-clickhouse-phase1.sql

# Option 2: Node.js
node scripts/migrate-clickhouse-phase1.js
```

### Production Server

```bash
# SSH into your server
ssh your-server

# Option 1: SQL (recommended - you can see each step)
clickhouse-client
# Then copy-paste commands from migrate-clickhouse-phase1.sql

# Option 2: Node.js
# Upload the script and run:
node scripts/migrate-clickhouse-phase1.js
```

## Monitoring Progress

### Check Data Copy Progress

```sql
-- Check row counts
SELECT COUNT(*) FROM analytics.visit_logs;
SELECT COUNT(*) FROM analytics.visit_logs_new;

-- Check data size
SELECT 
  table,
  formatReadableSize(sum(bytes_on_disk)) AS size
FROM system.parts
WHERE database = 'analytics' AND table IN ('visit_logs', 'visit_logs_new')
GROUP BY table;
```

### Check Projection Status

```sql
SELECT 
  name, 
  type, 
  status,
  formatReadableSize(bytes_on_disk) as size
FROM system.projection_parts 
WHERE table = 'visit_logs' AND database = 'analytics';
```

## Verification

After migration, test your queries:

```sql
-- Test date-range query (should be faster)
SELECT countDistinct(user_id) 
FROM analytics.visit_logs 
WHERE toDate(toTimeZone(timestamp, 'Asia/Seoul')) BETWEEN '2024-01-01' AND '2024-01-31';

-- Test campaign query
SELECT campaign_id, countDistinct(user_id)
FROM analytics.visit_logs
WHERE campaign_id = 1
GROUP BY campaign_id;
```

## Rollback Plan

If something goes wrong:

```sql
-- Restore old table
RENAME TABLE 
  analytics.visit_logs TO analytics.visit_logs_new,
  analytics.visit_logs_old TO analytics.visit_logs;

-- Drop the failed new table
DROP TABLE IF EXISTS analytics.visit_logs_new;
```

## Expected Performance Improvements

- **Date-range queries**: 10-100x faster (only scans relevant partitions)
- **Campaign analysis**: 5-50x faster (uses projections)
- **Channel performance**: 5-50x faster (uses projections)
- **Conversion analysis**: 5-50x faster (uses projections)

## Troubleshooting

### "Table already exists" error
- The migration was partially run before
- Check if `visit_logs_new` exists: `SHOW TABLES FROM analytics LIKE 'visit_logs%'`
- Drop it if needed: `DROP TABLE IF EXISTS analytics.visit_logs_new`

### "Out of memory" during data copy
- Copy data in batches (modify the INSERT query to use LIMIT/OFFSET)
- Or increase ClickHouse memory limits

### Projections not being used
- Projections are automatically used by ClickHouse when queries match
- Check with `EXPLAIN` to see if projections are used:
  ```sql
  EXPLAIN SELECT ... FROM analytics.visit_logs WHERE ...
  ```

## After Migration

1. **Monitor for 24-48 hours** to ensure everything works
2. **Test all your analytics endpoints**
3. **Check query performance** - should see significant improvements
4. **Drop old table** when confident:
   ```sql
   DROP TABLE analytics.visit_logs_old;
   ```

## Questions?

- Check ClickHouse logs: `/var/log/clickhouse-server/clickhouse-server.log`
- Check system tables: `SELECT * FROM system.tables WHERE database = 'analytics'`
- Verify partitions: `SELECT * FROM system.parts WHERE table = 'visit_logs'`

