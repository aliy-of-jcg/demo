# Tracking Code Insertion Issue Analysis

## 🔍 Issues Found

### 1. ✅ RESOLVED: `/api/log` Endpoint Removed

**Status**: The `/api/log` endpoint has been removed from the codebase. All tracking now goes through `/api/track` as the single source of truth.

**Previous Issue**: The `eventData` object being inserted into ClickHouse did NOT include `tracking_code` field.

**Resolution**: Endpoint removed and consolidated into `/api/track` which correctly handles `tracking_code`.

### 2. Missing `tracking_code` in `/api/track-internal/route.ts` (Still needs fix)

**Location**: `app/api/track-internal/route.ts` line 116-149

**Problem**: The values object being inserted does NOT include `tracking_code` field.

**Current Code**:
```typescript
await insertWithMemoryLimit({
  table: 'analytics.visit_logs',
  values: [{
    timestamp: timestampUTC,
    // ... other fields ...
    utm_source: normalizedUtmSource,
    utm_medium: utm_medium || '',
    utm_campaign: utm_campaign || '',
    utm_term: utm_term || '',
    utm_content: utm_content || '',
    // ❌ tracking_code is MISSING here
    campaign_id: 0,
    course_id: 0,
    // ... rest of fields ...
  }],
});
```

**Impact**: All events sent to `/api/track-internal` endpoint will have `tracking_code = ''` (empty string).

### 3. ✅ Correct Implementation in `/api/track/route.ts`

**Location**: `app/api/track/route.ts` line 239

**Status**: This endpoint correctly includes `tracking_code`:
```typescript
tracking_code: tracking_code || '',
```

### 4. ✅ Client-Side Script Sends `tracking_code`

**Location**: `public/cosmos-track.js` line 859, 912

**Status**: The client-side script correctly extracts and sends `tracking_code` in the event data.

## 📊 Root Cause Analysis

### Why Domain Names Ended Up as `tracking_code`

The domain-named `tracking_code` values (`svc.centras.ai`, `devsvc2.centras.ai`, `dev.cosmosai.co.kr`) likely came from:

1. **Backfilling/Migration**: Old data that was migrated without proper `tracking_code` mapping
2. **Legacy Tracking System**: Previous system that used domain names instead of tracking codes
3. **Manual Data Entry**: Records inserted manually with incorrect `tracking_code` values
4. **Environment-Specific Tracking**: Different environments (dev/staging/prod) using domain-based codes

### Why `274094538CR6` Has 0 Visitors

The UTM code `274094538CR6` exists in MySQL but has 0 visitors in ClickHouse because:

1. **Missing `tracking_code` in API endpoints**: `/api/track-internal` doesn't insert `tracking_code` (Note: `/api/log` has been removed)
2. **Client sends `tracking_code` but server ignores it**: The client extracts `tracking_code` from URL parameter `_tc` and sends it, but these endpoints don't use it
3. **All 2,688 visitors came through endpoints that don't save `tracking_code`**: They were recorded with empty or domain-named `tracking_code` values

## 🔧 Fixes Required

### Fix 1: ✅ COMPLETED - `/api/log` Removed

The `/api/log` endpoint has been removed. All tracking now uses `/api/track` which correctly handles `tracking_code`.

### Fix 2: Add `tracking_code` to `/api/track-internal/route.ts`

Add `tracking_code` to the values object:
```typescript
await insertWithMemoryLimit({
  table: 'analytics.visit_logs',
  values: [{
    // ... existing fields ...
    tracking_code: data.tracking_code || '',  // ✅ ADD THIS
    utm_source: normalizedUtmSource,
    // ... rest of fields ...
  }],
});
```

## 🧪 Verification Queries

### Check if other UTMs have the same issue:

```sql
-- Find UTMs with tracking_code in MySQL but 0 visitors in ClickHouse
SELECT 
  utm_codes.id,
  utm_codes.tracking_code,
  utm_codes.utm_campaign,
  utm_codes.utm_content,
  COUNT(DISTINCT visit_logs.user_id) as visitors_with_tracking_code
FROM utm_codes
LEFT JOIN analytics.visit_logs_buffer visit_logs 
  ON visit_logs.tracking_code = utm_codes.tracking_code
WHERE utm_codes.status != 'hidden'
GROUP BY utm_codes.id, utm_codes.tracking_code, utm_codes.utm_campaign, utm_codes.utm_content
HAVING visitors_with_tracking_code = 0
ORDER BY utm_codes.created_at DESC
LIMIT 20;
```

### Check records with domain-named tracking_codes:

```sql
-- Find all records with domain-named tracking_codes
SELECT 
  tracking_code,
  utm_campaign,
  utm_content,
  COUNT(DISTINCT user_id) as unique_visitors,
  COUNT(*) as total_records
FROM analytics.visit_logs_buffer
WHERE tracking_code LIKE '%.%'  -- Contains a dot (likely a domain)
  AND tracking_code NOT LIKE '%.%.%.%'  -- Not an IP address
  AND tracking_code != ''
GROUP BY tracking_code, utm_campaign, utm_content
ORDER BY unique_visitors DESC
LIMIT 20;
```

### Check records with empty tracking_code but valid UTM params:

```sql
-- Find records with empty tracking_code but matching UTM parameters
SELECT 
  utm_campaign,
  utm_source,
  utm_medium,
  utm_content,
  COUNT(DISTINCT user_id) as unique_visitors,
  COUNT(*) as total_records
FROM analytics.visit_logs_buffer
WHERE (tracking_code = '' OR tracking_code IS NULL)
  AND utm_campaign != ''
  AND utm_source != ''
  AND utm_medium != ''
GROUP BY utm_campaign, utm_source, utm_medium, utm_content
ORDER BY unique_visitors DESC
LIMIT 20;
```

## 📝 Next Steps

1. **Fix the code**: Add `tracking_code` to `/api/track-internal/route.ts` (Note: `/api/log` has been removed)
2. **Verify other UTMs**: Run verification queries to see how widespread the issue is
3. **Data cleanup**: After fixing the code, consider updating existing records with domain-named `tracking_code` values
4. **Test**: Verify that new tracking events correctly save `tracking_code`

