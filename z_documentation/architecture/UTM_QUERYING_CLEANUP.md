# UTM Querying Cleanup Guide

## 📋 Overview

This document describes the process of removing fallback logic from UTM querying after the database has been cleaned and all records are guaranteed to have `tracking_code` populated.

## 🎯 Current State (With Fallbacks)

### Why Fallbacks Exist

The current UTM querying implementation includes fallback logic to handle legacy data:

1. **Primary Method**: Query by `tracking_code` when available
2. **Fallback Method**: Query by UTM parameters (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`) when `tracking_code` is empty

This dual approach exists because:
- Historical data may have empty `tracking_code` values
- Some records were created before `tracking_code` was mandatory
- Migration from old tracking system may have incomplete data

### Current Query Pattern

**Visitors Query:**
```sql
WHERE (
  tracking_code = 'specific_code'  -- Primary method
  OR (
    utm_campaign = 'campaign_name'
    AND utm_source = 'source'
    AND utm_medium = 'medium'
    AND utm_content = 'content'
    AND (tracking_code = '' OR tracking_code IS NULL)  -- Legacy data only
  )
)
AND created_date_kst >= start_date
AND created_date_kst <= end_date
```

**Clicks Query:**
```sql
WHERE tracking_code = 'specific_code'
AND created_date >= start_date
AND created_date <= end_date
```

## ✅ Target State (After Cleanup)

### Simplified Query Pattern

After database cleanup, all queries will use only `tracking_code`:

**Visitors Query:**
```sql
WHERE tracking_code = 'specific_code'
AND created_date_kst >= start_date
AND created_date_kst <= end_date
```

**Clicks Query:**
```sql
WHERE tracking_code = 'specific_code'
AND created_date >= start_date
AND created_date <= end_date
```

### Benefits

1. **Simpler Queries**: Single WHERE condition, no OR logic
2. **Better Performance**: No complex OR conditions or UTM parameter matching
3. **Accurate Data**: Each UTM uniquely identified by `tracking_code`
4. **No Aggregation Issues**: Empty `utm_content` doesn't cause grouping problems
5. **Cleaner Code**: No fallback logic or legacy data handling

## 🔍 Pre-Cleanup Verification

Before removing fallbacks, verify the database is clean:

### 1. Check for Empty Tracking Codes in ClickHouse

```sql
-- Check visit_logs for empty tracking_code
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN tracking_code = '' OR tracking_code IS NULL THEN 1 END) as empty_tracking_code,
  COUNT(CASE WHEN tracking_code != '' AND tracking_code IS NOT NULL THEN 1 END) as has_tracking_code
FROM analytics.visit_logs_buffer;

-- Check tracking_events for empty tracking_code
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN tracking_code = '' OR tracking_code IS NULL THEN 1 END) as empty_tracking_code,
  COUNT(CASE WHEN tracking_code != '' AND tracking_code IS NOT NULL THEN 1 END) as has_tracking_code
FROM analytics.tracking_events_buffer;
```

### 2. Check for Legacy UTM Data

```sql
-- Find records with empty tracking_code but valid UTM parameters
SELECT 
  utm_campaign,
  utm_source,
  utm_medium,
  COUNT(DISTINCT user_id) as unique_visitors
FROM analytics.visit_logs_buffer
WHERE (tracking_code = '' OR tracking_code IS NULL)
  AND utm_campaign != ''
  AND utm_source != ''
  AND utm_medium != ''
GROUP BY utm_campaign, utm_source, utm_medium
ORDER BY unique_visitors DESC
LIMIT 20;
```

### 3. Verify All Active UTMs Have Tracking Codes

```sql
-- Check MySQL utm_codes table
SELECT 
  COUNT(*) as total_utms,
  COUNT(CASE WHEN tracking_code = '' OR tracking_code IS NULL THEN 1 END) as empty_tracking_code,
  COUNT(CASE WHEN tracking_code != '' AND tracking_code IS NOT NULL THEN 1 END) as has_tracking_code
FROM utm_codes
WHERE status != 'hidden';
```

### 4. Expected Results

- ✅ `empty_tracking_code` should be `0` in all queries
- ✅ All active UTMs in MySQL should have `tracking_code` populated
- ✅ No legacy UTM data should exist in ClickHouse

## 🧹 Database Cleanup Steps

### Step 1: Clean ClickHouse Data

**Option A: Complete Cleanup (Fresh Start)**
```bash
# Drop and recreate all tables
npm run clickhouse:clean
npm run clickhouse:init
```

**Option B: Selective Cleanup (Keep Recent Data)**
```sql
-- Delete records with empty tracking_code (if any remain)
DELETE FROM analytics.visit_logs_buffer
WHERE tracking_code = '' OR tracking_code IS NULL;

DELETE FROM analytics.tracking_events_buffer
WHERE tracking_code = '' OR tracking_code IS NULL;
```

### Step 2: Verify MySQL UTM Codes

```sql
-- Ensure all active UTMs have tracking_code
UPDATE utm_codes
SET tracking_code = CONCAT('legacy-', id)
WHERE (tracking_code = '' OR tracking_code IS NULL)
  AND status != 'hidden';
```

### Step 3: Add Database Constraints (Optional)

```sql
-- Add NOT NULL constraint to tracking_code in MySQL
ALTER TABLE utm_codes
MODIFY COLUMN tracking_code VARCHAR(255) NOT NULL;

-- Add default value constraint
ALTER TABLE utm_codes
MODIFY COLUMN tracking_code VARCHAR(255) NOT NULL DEFAULT '';
```

## 🔧 Code Changes Required

### Files to Modify

1. **`app/api/analytics/campaign-analysis/utm-breakdown/route.ts`**
   - Remove fallback logic from visitors query
   - Remove fallback logic from daily data query
   - Simplify to use only `tracking_code`

2. **`app/api/campaigns/[id]/route.ts`** (if applicable)
   - Remove legacy UTM parameter matching
   - Use only `tracking_code` for visitor queries

3. **`app/api/analytics/campaign-analysis/metrics/route.ts`** (if applicable)
   - Remove fallback UTM parameter matching
   - Use only `tracking_code` for queries

### Example Code Changes

**Before (With Fallback):**
```typescript
let visitWhereClause = '';
if (trackingCode && trackingCode !== '') {
  const escapedTrackingCode = trackingCode.replace(/'/g, "\\'");
  visitWhereClause = `(tracking_code = '${escapedTrackingCode}' OR (`;
  visitWhereClause += `utm_campaign = '${escapedCampaign}'`;
  visitWhereClause += ` AND utm_source = '${escapedSource}'`;
  visitWhereClause += ` AND utm_medium = '${escapedMedium}'`;
  visitWhereClause += ` AND utm_content = '${escapedContent}'`;
  visitWhereClause += ` AND (tracking_code = '' OR tracking_code IS NULL)`;
  visitWhereClause += `))`;
} else {
  // Fallback logic...
}
```

**After (Simplified):**
```typescript
if (!trackingCode || trackingCode === '') {
  // Skip this UTM - no tracking_code means no data
  return { /* empty metrics */ };
}

const escapedTrackingCode = trackingCode.replace(/'/g, "\\'");
const visitWhereClause = `tracking_code = '${escapedTrackingCode}' 
  AND created_date_kst >= toDate('${finalStartDate}') 
  AND created_date_kst <= toDate('${finalEndDate}')`;
```

## 🧪 Testing After Cleanup

### 1. Verify UTM Breakdown Accuracy

1. Navigate to Campaign Analysis → UTM Breakdown
2. Select a campaign with multiple UTMs
3. Verify each UTM shows:
   - ✅ Correct click counts (matching tracking links page)
   - ✅ Correct visitor counts (matching campaign details)
   - ✅ No duplicate or aggregated data

### 2. Test Edge Cases

- ✅ UTMs with empty `utm_content` show individual metrics
- ✅ UTMs with same source/medium but different content show separate data
- ✅ Legacy UTMs (if any) are handled gracefully

### 3. Performance Testing

- ✅ Query execution time should be faster (simpler WHERE clauses)
- ✅ No performance degradation on large datasets
- ✅ Cache invalidation works correctly

### 4. Data Consistency Checks

```sql
-- Compare UTM breakdown totals with campaign totals
-- Should match within acceptable margin
SELECT 
  'UTM Breakdown Total' as source,
  SUM(visitors) as total_visitors,
  SUM(clicks) as total_clicks
FROM (
  -- UTM breakdown query results
) utm_totals

UNION ALL

SELECT 
  'Campaign Details Total' as source,
  visitors as total_visitors,
  clicks as total_clicks
FROM (
  -- Campaign details query results
) campaign_totals;
```

## 📝 Migration Checklist

- [ ] Verify database is clean (all checks pass)
- [ ] Backup database before cleanup
- [ ] Clean ClickHouse data (if needed)
- [ ] Verify all MySQL UTMs have `tracking_code`
- [ ] Update code to remove fallback logic
- [ ] Test UTM breakdown accuracy
- [ ] Test campaign details accuracy
- [ ] Test performance improvements
- [ ] Verify no data loss
- [ ] Update documentation
- [ ] Deploy to dev environment
- [ ] Monitor for 24-48 hours
- [ ] Deploy to production

## ⚠️ Important Notes

1. **Data Loss Risk**: Removing fallback logic means legacy data without `tracking_code` will not be queried. Ensure all important data has been migrated.

2. **Backward Compatibility**: If you need to support both old and new data during transition, keep fallback logic until all data is migrated.

3. **Rollback Plan**: Keep the fallback code commented out or in a feature flag for easy rollback if issues arise.

4. **Monitoring**: After deployment, monitor:
   - Query performance
   - Data accuracy
   - Error rates
   - User reports of missing data

## 🔄 Rollback Procedure

If issues are discovered after removing fallbacks:

1. Revert code changes to restore fallback logic
2. Deploy hotfix immediately
3. Investigate root cause
4. Fix database/data issues
5. Retry cleanup process

## 📚 Related Documentation

- [System Architecture](./SYSTEM_ARCHITECTURE.md)
- [API Endpoints](./API_ENDPOINTS.md)
- [Campaign Analysis Features](../features/FEATURES_OVERVIEW.md)

## 🎯 Success Criteria

The cleanup is successful when:

- ✅ All queries use only `tracking_code`
- ✅ No fallback logic remains in codebase
- ✅ All UTMs show accurate, individual metrics
- ✅ No data loss or missing visitors/clicks
- ✅ Query performance is improved or maintained
- ✅ No user-reported issues

---

**Last Updated**: 2025-12-19  
**Status**: Draft - Pending Database Cleanup  
**Owner**: Development Team

