# Domain Blocking Implementation

## Overview
Implemented immediate domain blocking with no grace period. When a domain is disabled, tracking is blocked on the very next request, including for active sessions.

## How It Works

### Cache Structure
```typescript
{
  is_enabled: boolean,      // Whether domain is enabled
  last_refresh: number,      // When cache was last updated (timestamp)
  updated_at: number         // When domain was last modified in DB (timestamp)
}
```

### Logic Flow

1. **Every tracking request checks:**
   - Query MySQL for `is_enabled` and `updated_at`
   - Compare DB `updated_at` with cached `updated_at`
   - If DB is newer → invalidate cache and use DB value
   - If cache is valid and fresh (< 5 min) → use cached value
   - If cache is stale → refresh from DB

2. **Immediate Effect:**
   - When you disable a domain → DB `updated_at` = NOW()
   - Next tracking request → DB `updated_at` > cached `updated_at`
   - Cache is invalidated → domain blocked immediately

3. **Performance:**
   - Enabled domains that haven't changed still use cache
   - Only queries DB when:
     - Domain status changed in DB
     - Cache is stale (> 5 minutes)
     - No cache entry exists

### Behavior Examples

#### Scenario 1: Disable Domain with Active Session
```
10:00 AM - User starts session (domain enabled, cached)
10:05 AM - Admin disables domain → DB updated_at = 10:05
10:06 AM - User navigates to another page:
  - Cache says: enabled (refreshed at 10:00)
  - DB updated_at: 10:05 (newer than cache)
  - Queries DB → finds disabled
  - Blocks tracking immediately ✅
```

#### Scenario 2: Re-enable Domain
```
10:00 AM - Domain is disabled
10:05 AM - Admin re-enables domain → DB updated_at = 10:05
10:06 AM - Tracking request comes in:
  - Cache says: disabled
  - DB updated_at: 10:05 (newer than cache)
  - Queries DB → finds enabled
  - Allows tracking immediately ✅
```

#### Scenario 3: Enabled Domain (No Changes)
```
10:00 AM - Domain enabled, cache refreshed
10:02 AM - Tracking request:
  - Cache says: enabled (refreshed at 10:00)
  - DB updated_at: 09:55 (older than cache)
  - Uses cached value (fast path) ✅
```

### UTM Link Behavior

When a domain is disabled:
- **Click tracking**: Still works (logged to `tracking_events`)
- **Redirect**: Still works (user is redirected)
- **Visit tracking**: Blocked (no entry in `visit_logs`)
- **Pageview tracking**: Blocked

This means you can see how many people clicked the UTM link, but not their page views or session data.

## Key Features

1. **Immediate Blocking**: No grace period, no waiting
2. **Performance**: Uses cache when domain status hasn't changed
3. **Reliability**: Always checks DB `updated_at` to catch changes
4. **Fail-Safe**: On DB errors, falls back to cache or fails open (allows tracking)

## Database Dependency

This implementation relies on the `updated_at` column in `tracked_websites` table being automatically updated when `is_enabled` changes:

```sql
updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

## Console Logging

When cache is invalidated, you'll see:
```
🔄 Cache invalidated for example.com: DB updated at 2025-11-19T10:05:00.000Z, cache from 2025-11-19T10:00:00.000Z
```

When tracking is blocked:
```
🚫 Tracking blocked for disabled domain: example.com
```

## Testing

To verify immediate blocking:

1. Check domain is enabled: `SELECT * FROM tracked_websites WHERE domain = 'example.com';`
2. Generate tracking request (visit the site)
3. Disable domain: `UPDATE tracked_websites SET is_enabled = FALSE WHERE domain = 'example.com';`
4. Generate another tracking request immediately
5. Check logs for `🚫 Tracking blocked for disabled domain: example.com`
6. Verify no new entry in ClickHouse: `SELECT * FROM visit_logs WHERE page_url LIKE '%example.com%' ORDER BY timestamp DESC LIMIT 5;`

## Notes

- Historical data remains intact when a domain is disabled
- `last_seen` is only updated for enabled domains
- New domains are auto-registered as enabled
- Cache TTL is 5 minutes for performance, but invalidation is immediate when status changes

