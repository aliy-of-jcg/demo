# ClickHouse Schema Migration - created_date_kst Implementation

## Summary

Successfully migrated all analytics queries to use the `created_date_kst` column for date filtering, eliminating UTC/KST timezone boundary issues and enabling partition pruning for better performance.

## Changes Made

### 1. Created KST Date Utility (lib/utils/kst-date.ts)
- `getCurrentDateKST()`: Get current date in KST timezone
- `getDateRangeKST(days)`: Get date range in KST
- `toKSTDateString(date)`: Convert Date object to KST date string

### 2. Updated Track Routes
- `app/api/track/route.ts`: Explicitly set `created_date_kst` in inserts
- `app/api/track-internal/route.ts`: Explicitly set `created_date_kst` in inserts

### 3. Updated Analytics Query Routes (All WHERE clauses now use created_date_kst)

**Tracked Websites:**
- `app/api/analytics/tracked-websites/route.ts`
- `app/api/analytics/tracked-websites/[domain]/pages/route.ts`

**Session & Time Analysis:**
- `app/api/analytics/session-journeys/route.ts`
- `app/api/analytics/time-analysis/route.ts`

**Returning Analysis:**
- `app/api/analytics/returning-analysis/visit-frequency/route.ts`
- `app/api/analytics/returning-analysis/return-intervals/route.ts`
- `app/api/analytics/returning-analysis/new-vs-returning/route.ts`
- `app/api/analytics/returning-analysis/insights/route.ts`
- `app/api/analytics/returning-analysis/daily-trend/route.ts`

**Environment Analysis:**
- `app/api/analytics/environment-analysis/devices/route.ts`
- `app/api/analytics/environment-analysis/os/route.ts`
- `app/api/analytics/environment-analysis/browsers/route.ts`
- `app/api/analytics/environment-analysis/resolutions/route.ts`

**Campaign Analysis:**
- `app/api/analytics/campaign-analysis/utm-breakdown/route.ts`
- `app/api/analytics/campaign-analysis/metrics/route.ts`

**Performance & Others:**
- `app/api/analytics/performance/route.ts`
- `app/api/analytics/channel-performance/route.ts`
- `app/api/analytics/conversion-analysis/route.ts`

**Page Flow Analysis:**
- `app/api/analytics/page-flow-analysis/landing-pages/route.ts`
- `app/api/analytics/page-flow-analysis/utm/route.ts`
- `app/api/analytics/page-flow-analysis/transitions/route.ts`
- `app/api/analytics/page-flow-analysis/insights/route.ts`
- `app/api/analytics/page-flow-analysis/exit-pages/route.ts`

## Query Pattern Changes

### Before:
```sql
WHERE toDate(timestamp) BETWEEN toDate('${startDate}') AND toDate('${endDate}')
-- OR
WHERE toDate(toTimeZone(timestamp, '${timezone}')) >= toDate('${startDate}')
```

### After:
```sql
WHERE created_date_kst >= toDate('${startDate}') AND created_date_kst <= toDate('${endDate}')
```

### Note on SELECT/GROUP BY:
Timezone conversion remains in SELECT/GROUP BY clauses for display purposes:
```sql
SELECT toDate(toTimeZone(timestamp, '${timezone}')) as date
```
This is correct - filter by `created_date_kst`, display by user timezone.

## Benefits

1. **Partition Pruning**: Queries now use the partition key directly, drastically improving performance
2. **Eliminates UTC/KST Boundary Issues**: No more 9-hour data visibility gaps
3. **Consistency**: All analytics use the same KST-based date semantics
4. **Performance**: Pre-computed column avoids runtime timezone conversion in WHERE clauses

## Schema

The `visit_logs` table schema (already applied):
```sql
CREATE TABLE IF NOT EXISTS analytics.visit_logs (
  timestamp DateTime,
  created_date_kst Date DEFAULT toDate(toTimeZone(timestamp, 'Asia/Seoul')),
  -- ... other columns ...
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_date_kst)
ORDER BY (created_date_kst, session_id, user_id)
```

## Testing Checklist

- [ ] Verify tracked-websites page shows data immediately
- [ ] Check all analytics dashboards load correctly
- [ ] Confirm date filtering works across all pages
- [ ] Test timezone switching (if applicable)
- [ ] Verify no UTC/KST boundary issues at midnight
- [ ] Monitor query performance improvements
