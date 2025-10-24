# 🔧 Fixed: Campaign Visitors & Course Visits Tracking

## Problems Identified & Fixed

### **Problem 1: Visitors Count Not Incrementing** ✅ FIXED
- **Root Cause:** Campaigns were counting visitors from `tracking_events` (redirect clicks) using IP addresses
- **Issue:** Same visitor clicking link multiple times = 1 visitor (correct), but pageviews weren't being counted
- **Why clearing cache didn't work:** Visitor tracking uses cookies (`cosmos_visitor_id`), not cache

### **Problem 2: Course Visits Not Recording** ✅ FIXED
- **Root Cause:** Tracking link redirects didn't include UTM parameters
- **Flow was:**
  ```
  Click /t/ABC123 → Logs click → Redirects to http://aptdecor.uz (NO UTMs)
  → cosmos-track.js sends pageview → /api/log can't link to campaign
  → Stores with course_id=0 → Course visits = 0
  ```

---

## 🔧 Changes Made

### **Fix 1: Always Append UTM Parameters to Redirects**
**File:** `/app/t/[code]/route.ts`

**Before:**
```typescript
// Only append UTM if explicitly requested with ?utm=true
if (appendUtm && utmSource && utmMedium && utmCampaign) {
  // append UTMs
}
```

**After:**
```typescript
// ✨ ALWAYS append UTM parameters to enable tracking
if (utmSource && utmMedium && utmCampaign) {
  const urlObj = new URL(targetUrl);
  urlObj.searchParams.set("utm_source", utmSource);
  urlObj.searchParams.set("utm_medium", utmMedium);
  urlObj.searchParams.set("utm_campaign", utmCampaign);
  finalRedirectUrl = urlObj.toString();
  console.log("✅ UTM parameters appended to URL for tracking");
}
```

**Result:** Now when users click tracking links, they're redirected with UTM parameters, allowing `/api/log` to link pageviews to campaigns and courses.

---

### **Fix 2: Count Visitors from visit_logs Instead of tracking_events**
**File:** `/app/api/campaigns/route.ts`

**Before:**
```typescript
// Counted unique visitors from tracking_events using IP addresses
COUNT(DISTINCT ip_address) as unique_visitors
FROM analytics.tracking_events
```

**After:**
```typescript
// Query 1: Get clicks from tracking_events (redirect clicks)
SELECT tracking_code, COUNT(*) as total_clicks
FROM analytics.tracking_events
GROUP BY tracking_code

// Query 2: Get unique visitors from visit_logs (actual pageviews)
SELECT campaign_id, COUNT(DISTINCT user_id) as unique_visitors
FROM analytics.visit_logs
WHERE campaign_id > 0
GROUP BY campaign_id
```

**Result:** 
- Clicks still counted from redirect events
- Visitors now counted from actual pageviews (more accurate)
- Each unique user_id = 1 visitor (cookie-based, 2-year duration)

---

## 📊 New Data Flow

### **Complete Tracking Journey:**

```
1. User clicks tracking link
   http://localhost:3000/t/ABC123
   
2. /t/[code] endpoint:
   ✅ Logs click to tracking_events
   ✅ Extracts UTM from ClickHouse tracking_codes table
   ✅ Appends UTMs to redirect URL
   ✅ Redirects to: http://aptdecor.uz?utm_source=google&utm_medium=cpc&utm_campaign=spring_sale

3. User lands on aptdecor.uz with UTM parameters
   
4. cosmos-track.js extracts UTMs and sends to /api/log
   
5. /api/log endpoint:
   ✅ Queries MySQL utm_codes table
   ✅ Matches UTM parameters to campaign
   ✅ Gets campaign_id and course_id
   ✅ Stores in visit_logs with proper IDs
   
6. Analytics update:
   ✅ Campaign shows 1 click (from tracking_events)
   ✅ Campaign shows 1 visitor (from visit_logs)
   ✅ Course shows 1 visit (from visit_logs WHERE course_id > 0)
```

---

## 🧪 How to Test

### **Test 1: Verify UTM Parameters Are Appended**

1. **Create a tracking link** (or use existing one):
   - Go to campaign detail page
   - Note the tracking code (e.g., `ABC123`)

2. **Click the tracking link:**
   ```
   http://localhost:3000/t/ABC123
   ```

3. **Check the redirected URL** in your browser:
   - Should include: `?utm_source=X&utm_medium=Y&utm_campaign=Z`
   - Example: `http://aptdecor.uz?utm_source=google&utm_medium=cpc&utm_campaign=spring_sale`

4. **Check server console:**
   ```
   ✅ UTM parameters appended to URL for tracking
   🔗 Redirecting to: http://aptdecor.uz?utm_source=...
   ```

---

### **Test 2: Verify Campaign Visitors Increment**

1. **Clear browser cookies** (visitor ID is cookie-based):
   - DevTools (F12) → Application → Cookies
   - Delete `cosmos_visitor_id`
   - This makes you a "new visitor"

2. **Click a tracking link** (from step above)

3. **Navigate back to campaigns page:**
   ```
   http://localhost:3000/campaigns
   ```

4. **Check the campaign:**
   - **Clicks:** Should increment by 1 ✅
   - **Visitors:** Should increment by 1 ✅ (if you cleared cookies)

5. **Click the same link again WITHOUT clearing cookies:**
   - **Clicks:** +1 (total: 2)
   - **Visitors:** No change (same user_id, still 1 unique visitor)

**This is correct behavior!** Visitors = unique users, not total visits.

---

### **Test 3: Verify Course Visits Are Recorded**

1. **Ensure your campaign is linked to a course:**
   - Go to campaign detail page
   - Check "Course" field shows a course name
   - If not, edit campaign and select a course

2. **Click the campaign's tracking link**

3. **Check server console for:**
   ```
   ✅ Linked pageview to campaign: Campaign Name (campaign_id: X, course_id: Y)
   ```

4. **Navigate to courses page:**
   ```
   http://localhost:3000/courses
   ```

5. **Verify:**
   - **Summary card "Total Visits":** Should show > 0
   - **Course row "Total Visits":** Should show visit count for that specific course

---

## 🔍 Debugging Tips

### **If visitors not incrementing:**

**Check 1: Are you clearing cookies?**
```javascript
// Check your current visitor ID in console:
document.cookie
// Should show: cosmos_visitor_id=xxxx-xxxx-xxxx
```

**Check 2: Is campaign_id being populated?**
```sql
-- Check ClickHouse
SELECT campaign_id, course_id, COUNT(DISTINCT user_id) as visitors
FROM analytics.visit_logs
WHERE campaign_id > 0
GROUP BY campaign_id, course_id;
```

**Check 3: Are UTM parameters being matched?**
```
-- Check server console when you visit a page with UTMs:
✅ Linked pageview to campaign: ...  (✅ Good)
OR
ℹ️ No campaign match found...        (❌ Problem)
```

---

### **If course visits not recording:**

**Check 1: Campaign has a course_id?**
```sql
SELECT id, name, course_id FROM campaigns WHERE id = YOUR_CAMPAIGN_ID;
-- course_id should NOT be NULL
```

**Check 2: UTM parameters match exactly?**
```sql
-- Check what UTMs exist in utm_codes:
SELECT utm_campaign, utm_source, utm_medium 
FROM utm_codes 
WHERE campaign_id = YOUR_CAMPAIGN_ID;

-- Make sure your tracking link uses these EXACT values
```

**Check 3: ClickHouse has the data?**
```sql
SELECT COUNT(*) FROM analytics.visit_logs WHERE course_id > 0;
-- Should be > 0 if tracking is working
```

---

## 📊 Understanding Visitor Counts

### **Why Visitors Don't Change After 1st Click:**

**Visitor tracking uses `user_id` (cookie-based UUID):**
- First visit: New `cosmos_visitor_id` cookie created → `user_id` = UUID-A
- Visit 2-100: Same cookie, same `user_id` = UUID-A
- `COUNT(DISTINCT user_id)` = 1 (correct!)

**To test as a new visitor:**
1. Clear cookies (not cache!)
2. OR use Incognito/Private browsing
3. OR use a different browser

**This is the correct behavior for analytics!**
- Google Analytics works the same way
- 1 person = 1 unique visitor
- 10 pageviews from 1 person = still 1 unique visitor

---

## 🎯 Key Differences: Clicks vs Visitors

| Metric | Source | What It Counts | Increments When |
|--------|--------|----------------|-----------------|
| **Clicks** | `tracking_events` | Redirect clicks | Every click on tracking link |
| **Visitors** | `visit_logs` | Unique users | First visit only (per user) |
| **Course Visits** | `visit_logs` | Unique users per course | First visit to course pages |

---

## ✅ Success Criteria

After the fixes, you should see:

### **Campaigns Page:**
- ✅ Clicks increment every time you click a tracking link
- ✅ Visitors increment when NEW user (new cookie) clicks
- ✅ Visitors stay same when SAME user clicks again

### **Courses Page:**
- ✅ Total Visits shows > 0 in summary card
- ✅ Individual courses show their visit counts
- ✅ Counts update after clicking tracking links

### **Server Console:**
- ✅ "UTM parameters appended to URL for tracking"
- ✅ "Linked pageview to campaign: ..." (when visiting with UTMs)
- ✅ "Tracking event logged successfully" (on redirect)

---

## 📁 Files Modified

```
✏️ /app/t/[code]/route.ts
   - Now always appends UTM parameters to redirects
   - Enables campaign/course linking for pageviews

✏️ /app/api/campaigns/route.ts
   - Separated clicks query (tracking_events)
   - Added visitors query (visit_logs)
   - Now counts visitors from actual pageviews

📄 /TESTING_COURSE_VISITS.md (exists)
   - Contains UTM linking testing guide

📄 /COURSE_VISITS_FIXED.md (this file)
   - Documents the fixes made
```

---

## 🚀 What's Next

With tracking now working correctly:

1. ✅ **Phase 1 Complete** - Data collection working
2. 🔜 **Phase 2** - Build 7 analytics API endpoints
3. 🔜 **Phase 3** - Connect static pages to real data
4. 🔜 **Phase 4** - Performance optimizations

---

**Last Updated:** Phase 1 Enhancement - Visitor Tracking & Course Attribution Fixed

