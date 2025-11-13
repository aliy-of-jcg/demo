# Channel Performance Fix - Google Analytics Approach

## Problem
Channel performance was grouping by `campaigns.source` (configuration) instead of `visit_logs.utm_source` (actual traffic). This caused discrepancies when:
- A campaign had multiple UTM codes with different sources
- UTM codes were deleted or edited
- Admin created campaigns with source="instagram" but generated utm_codes with source="kakao"

## Solution (GA's Approach)
Query actual traffic data from `visit_logs` (ClickHouse), not campaign configuration from MySQL.

## What Changed

### ✅ Modified File
- `app/api/analytics/channel-performance/route.ts`

### Key Changes:
1. **Query Strategy**: Now queries `visit_logs` first, grouped by `utm_source, utm_medium, campaign_id`
2. **Data Flow**: 
   - Old: campaigns → visit_logs (by campaign_id) → group by campaign.source ❌
   - New: visit_logs (by utm_source) → campaigns (for metadata) → group by traffic.utm_source ✅
3. **Grouping**: Groups by `traffic.utm_source` (actual traffic), not `campaign.source` (config)
4. **Result**: Campaign #3 can now appear under multiple channels (Kakao, Email, Instagram) based on actual traffic

### 📝 Documentation Added
- `scripts/init-mysql.sql`: Added comments clarifying `campaigns.source/medium` are for admin UI only

## What Did NOT Change

### ❌ No Database Changes
- ✅ `campaigns` table: Kept `source` and `medium` columns (for admin UI/organization)
- ✅ `utm_codes` table: No changes
- ✅ `visit_logs` table: No changes
- ✅ No migrations needed
- ✅ No server restarts required

### Purpose of campaigns.source/medium
These fields are now used for:
1. **Admin UI**: Organizing campaigns by channel
2. **Default Values**: Pre-filling UTM creation forms
3. **Filtering**: "Show me all Facebook campaigns"
4. **Documentation**: Shows campaign's intended channel
5. **NOT for reporting**: Channel performance ignores these fields

## How It Works Now

### Example: Campaign #3 "winter_course"

**MySQL campaigns table:**
```sql
id: 3, name: "winter_course", source: "instagram", medium: "social"
```

**MySQL utm_codes table:**
```sql
campaign_id: 3, utm_source: "kakao",     utm_medium: "display"
campaign_id: 3, utm_source: "email",     utm_medium: "referral"  
campaign_id: 3, utm_source: "instagram", utm_medium: "social"
```

**ClickHouse visit_logs (actual traffic):**
```sql
campaign_id: 3, utm_source: "kakao",     sessions: 500
campaign_id: 3, utm_source: "email",     sessions: 200
campaign_id: 3, utm_source: "instagram", sessions: 50
```

**Channel Performance Report:**
```
Kakao Channel:
  - winter_course: 500 sessions

Email Channel:
  - winter_course: 200 sessions

Instagram Channel:
  - winter_course: 50 sessions
```

## Benefits

✅ **Accurate Attribution**: Reports show actual traffic sources, not configurations  
✅ **Historical Accuracy**: Deleting/editing UTM codes doesn't affect past data  
✅ **Multi-Channel Campaigns**: One campaign can correctly appear across multiple channels  
✅ **GA Compatibility**: Follows Google Analytics' proven architecture  
✅ **Zero Database Changes**: Pure code fix, no schema migrations  

## Testing

To verify the fix:
1. Go to `/channel-performance` page
2. Campaign #3 should now appear under Kakao, Email, and Instagram channels separately
3. Check browser console for: `"✅ Channel Performance data fetched (GA approach)"`
4. Each channel should show accurate visit counts based on actual UTM traffic

## References

- GA4 Architecture: Queries session data (BigQuery), not campaign configs
- Configuration ≠ Reality: What you configured vs what actually happened
- Single Source of Truth: `visit_logs` for all reporting, `campaigns` for management

