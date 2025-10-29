# Analytics Platform Enhancement Plan

## Project Overview

CosMos AI is currently at ~70% completion (7 static analytics pages built). This plan outlines the remaining work to connect these pages to real data and complete the marketing analytics platform.

**Architecture:**
- Frontend: Next.js 14 (React + TypeScript)
- Backend: Next.js API routes
- Databases: MySQL (campaigns/courses) + ClickHouse (analytics events)
- Deployment: Single organization (aptdecor.uz initially), extensible to multi-tenant

**Current Status:**
- ✅ All 7 Log Analysis pages built with static data
- ✅ Campaign Management fully functional
- ✅ Course management fully functional
- ✅ Database schemas (MySQL + ClickHouse) in place
- ✅ Server-side redirect tracking (`/t/{code}`) working
- ⚠️ Need: Client-side tracking script with page flow support
- ⚠️ Need: API endpoints to fetch real data for analytics pages

---

## Phase 1: Enhanced Data Collection Foundation

**Goal:** Implement client-side tracking with page flow support and connect existing APIs to ClickHouse.

### Task 1: Enhanced Client-Side Tracking Script

**File:** `/public/cosmos-track.js`

**Core Tracking Features:**
- Auto-capture pageviews on target website
- Generate/persist visitor UUID in cookie
- Generate session ID per browsing session
- Extract UTM parameters from URL
- Parse user agent (device/OS/browser)
- Measure time on page

**Page Flow Enhancements (CRITICAL for Page Flow Analysis page):**
- Track page sequence number within session
- Identify landing pages (first page of session)
- Store previous page URL for navigation flow

**Implementation:**
```javascript
// Page sequence tracking
let pageSequence = parseInt(sessionStorage.getItem('cosmos_page_seq') || '0');
pageSequence++;
sessionStorage.setItem('cosmos_page_seq', pageSequence.toString());

const isLandingPage = pageSequence === 1;
const previousPageUrl = sessionStorage.getItem('cosmos_last_page') || '';

// Enhanced tracking data
{
  page_sequence: pageSequence,
  is_landing_page: isLandingPage ? 1 : 0,
  previous_page_url: previousPageUrl,
  // ... other fields
}

sessionStorage.setItem('cosmos_last_page', window.location.href);
```

### Task 2: Enhanced API Endpoint

**File:** `/app/api/log/route.ts`

**Updates:**
- Accept page flow fields (`page_sequence`, `is_landing_page`, `previous_page_url`)
- Validate and insert into ClickHouse `visit_logs`
- Handle CORS for aptdecor.uz

### Task 3: Schema Enhancement

**ClickHouse `visit_logs` table additions:**
```sql
ALTER TABLE analytics.visit_logs
ADD COLUMN page_sequence Int32 DEFAULT 0,
ADD COLUMN is_landing_page UInt8 DEFAULT 0,
ADD COLUMN is_exit_page UInt8 DEFAULT 0,
ADD COLUMN previous_page_url String DEFAULT '';
```

### Task 4: Real Budget/Cost Integration

**Files to modify:**
- `/app/api/campaigns/route.ts` - Return actual spent/budget from MySQL
- `/app/api/performance/route.ts` - Calculate real CPA using campaign budget data

### Task 5: Tracking Links Click Count Integration

**Files to modify:**
- `/app/api/tracking/links/route.ts` - Query ClickHouse for click counts
- `/app/tracking/page.tsx` - Display real click counts

### Task 6: Course Analytics Integration

**Files to modify:**
- `/app/api/courses/route.ts` - Join with ClickHouse for real metrics
- `/app/courses/page.tsx` - Display real active_campaigns and total_visits

---

## Phase 2: Analytics API Development

**Goal:** Create API endpoints to fetch real data for all 7 analytics pages.

**Dependencies:** Phase 1 complete (tracking script deployed, data flowing)

### 2.1 Performance Dashboard API

**Route:** `/app/api/analytics/performance/route.ts`

**Data to provide:**
- Total visitors, conversions, conversion rate, revenue
- Channel breakdown (by utm_source)
- Visitor trend (daily aggregation)

**ClickHouse Query Pattern:**
```sql
SELECT 
  COUNT(DISTINCT user_id) as visitors,
  SUM(CASE WHEN event_type = 'conversion' THEN 1 ELSE 0 END) as conversions,
  utm_source as channel,
  toDate(timestamp) as date
FROM visit_logs
WHERE timestamp BETWEEN :start AND :end
GROUP BY utm_source, date;
```

### 2.2 Source & Media Analysis API

**Route:** `/app/api/analytics/source-analysis/route.ts`

**Data to provide:**
- Source breakdown with visitors, conversions, cost
- Medium breakdown per source
- Comparison metrics

**Query Pattern:**
```sql
SELECT 
  utm_source,
  utm_medium,
  COUNT(DISTINCT user_id) as visitors,
  SUM(CASE WHEN event_type = 'conversion' THEN 1 ELSE 0 END) as conversions,
  AVG(time_on_page) as avg_time
FROM visit_logs
WHERE timestamp BETWEEN :start AND :end
GROUP BY utm_source, utm_medium;
```

### 2.3 Campaign Analysis API

**Route:** `/app/api/analytics/campaign-analysis/route.ts`

**Data to provide:**
- Campaign metrics (visitors, conversions, revenue, CPA, ROAS)
- Visitor trend by date
- Visit time distribution
- Daily performance breakdown
- Filter by platform (utm_source)

**Query Pattern:**
```sql
SELECT 
  campaign_id,
  utm_source,
  toDate(timestamp) as date,
  toHour(timestamp) as hour,
  COUNT(DISTINCT user_id) as visitors,
  SUM(CASE WHEN event_type = 'conversion' THEN 1 ELSE 0 END) as conversions
FROM visit_logs
WHERE campaign_id = :id 
  AND (:platform = 'all' OR utm_source = :platform)
  AND timestamp BETWEEN :start AND :end
GROUP BY campaign_id, utm_source, date, hour;
```

### 2.4 Environment Analysis API

**Route:** `/app/api/analytics/environment-analysis/route.ts`

**Data to provide:**
- Device breakdown (Mobile/Desktop/Tablet)
- OS breakdown (Android, iOS, Windows, macOS, Linux)
- Browser breakdown (Chrome, Safari, Samsung Internet, Edge, Firefox)
- Screen resolution distribution

**Query Pattern:**
```sql
SELECT 
  device_type,
  os,
  browser,
  screen_resolution,
  COUNT(DISTINCT user_id) as visitors,
  SUM(CASE WHEN event_type = 'conversion' THEN 1 ELSE 0 END) as conversions,
  AVG(time_on_page) as avg_time
FROM visit_logs
WHERE timestamp BETWEEN :start AND :end
GROUP BY device_type, os, browser, screen_resolution;
```

### 2.5 Time-based Analysis API

**Route:** `/app/api/analytics/time-analysis/route.ts`

**Data to provide:**
- Hourly trends (0-23 hours)
- Day of week distribution
- Peak hour/day identification
- Time slot performance (dawn/morning/afternoon/evening)

**Query Pattern:**
```sql
SELECT 
  toHour(timestamp) as hour,
  toDayOfWeek(timestamp) as day_of_week,
  COUNT(DISTINCT user_id) as visitors,
  AVG(time_on_page) as avg_time,
  SUM(CASE WHEN page_sequence = 1 AND event_type = 'exit' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as bounce_rate
FROM visit_logs
WHERE timestamp BETWEEN :start AND :end
GROUP BY hour, day_of_week;
```

### 2.6 Returning Visitor Analysis API

**Route:** `/app/api/analytics/returning-analysis/route.ts`

**Data to provide:**
- New vs returning visitor counts
- Visit frequency distribution (1x, 2x, 3x, 4x, 5+)
- Daily new/returning trend
- Engagement metrics by visitor type

**Query Pattern:**
```sql
SELECT 
  is_new_visitor,
  visit_count,
  COUNT(DISTINCT user_id) as visitors,
  AVG(page_sequence) as avg_pages,
  AVG(time_on_page) as avg_time,
  toDate(timestamp) as date
FROM visit_logs
WHERE timestamp BETWEEN :start AND :end
GROUP BY is_new_visitor, visit_count, date;
```

### 2.7 Page Flow Analysis API

**Route:** `/app/api/analytics/page-flow/route.ts`

**Data to provide:**
- Top landing pages with bounce rates
- Top exit pages with exit rates
- Page-to-page navigation flow
- Average pages per session by source

**Query Patterns:**

**Landing Pages:**
```sql
SELECT 
  page_url,
  COUNT(*) as total_entries,
  COUNT(DISTINCT session_id) as unique_sessions,
  AVG(time_on_page) as avg_time,
  SUM(CASE WHEN page_sequence = 1 AND event_type = 'exit' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as bounce_rate
FROM visit_logs
WHERE is_landing_page = 1
  AND timestamp BETWEEN :start AND :end
GROUP BY page_url
ORDER BY total_entries DESC;
```

**Exit Pages:**
```sql
SELECT 
  v.page_url as exit_page,
  COUNT(*) as exit_count,
  COUNT(*) * 100.0 / (SELECT COUNT(*) FROM visit_logs WHERE timestamp BETWEEN :start AND :end) as exit_rate
FROM visit_logs v
INNER JOIN (
  SELECT session_id, MAX(timestamp) as max_time
  FROM visit_logs
  WHERE timestamp BETWEEN :start AND :end
  GROUP BY session_id
) last_pages ON v.session_id = last_pages.session_id AND v.timestamp = last_pages.max_time
GROUP BY v.page_url
ORDER BY exit_count DESC;
```

**Page Navigation Flow:**
```sql
SELECT 
  previous_page_url as from_page,
  page_url as to_page,
  COUNT(*) as transition_count
FROM visit_logs
WHERE previous_page_url != ''
  AND timestamp BETWEEN :start AND :end
GROUP BY previous_page_url, page_url
ORDER BY transition_count DESC
LIMIT 50;
```

---

## Phase 3: Frontend Integration

**Goal:** Connect all 7 static pages to real APIs and replace static data.

### Pages to Connect:

1. **Performance Dashboard** (`/performance`) → `/api/analytics/performance`
2. **Source & Media Analysis** (`/source-analysis`) → `/api/analytics/source-analysis`
3. **Campaign Analysis** (`/campaign-analysis`) → `/api/analytics/campaign-analysis`
4. **Environment Analysis** (`/environment-analysis`) → `/api/analytics/environment-analysis`
5. **Time-based Analysis** (`/time-analysis`) → `/api/analytics/time-analysis`
6. **Returning Visitor Analysis** (`/returning-analysis`) → `/api/analytics/returning-analysis`
7. **Page Flow Analysis** (`/page-flow-analysis`) → `/api/analytics/page-flow`

### Integration Pattern:

```typescript
// Replace static data with API calls
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function fetchData() {
    setLoading(true);
    const response = await fetch(`/api/analytics/performance?start=${dateRange.start}&end=${dateRange.end}`);
    const result = await response.json();
    setData(result);
    setLoading(false);
  }
  fetchData();
}, [dateRange]);

if (loading) return <LoadingSkeleton />;
if (!data) return <ErrorState />;

// Render with real data
return <Charts data={data} />;
```

---

## Phase 4: Performance Optimization

**Goal:** Optimize pages for production use.

### 4.1 Add React Memoization
- Move constants outside components
- Memoize derived data and expensive calculations

### 4.2 Server-Side Filtering
- Accept query parameters for filtering
- Filter data in ClickHouse before sending to client

### 4.3 Data Caching
- Browser cache with React Query
- Server-side cache with Redis (optional)
- ClickHouse materialized views for heavy aggregations

### 4.4 Loading States & Error Handling
- Loading skeletons
- Error states with retry
- Empty states

### 4.5 Request Debouncing
- Debounce filter inputs
- Debounce search

---

## Additional Tools (Optional)

### UTM Builder Tool
**Route:** `/app/tools/utm-builder/page.tsx`
- Form inputs for all UTM parameters
- Real-time URL preview
- Copy to clipboard
- Save to database

### Enhanced Tracking Links Page
**Route:** `/app/tracking/page.tsx` (enhance existing)
- Summary stats (total, active, unused, total clicks)
- Full UTM URL display
- Click count from ClickHouse
- Status filtering

---

## Testing Strategy

1. Deploy tracking script to aptdecor.uz
2. Generate test traffic with various UTM parameters
3. Verify ClickHouse receives pageview events
4. Test each analytics page with real data
5. Validate calculations (CPA, CTR, bounce rate, page flow)
6. Test date range filtering across all pages
7. Test platform filtering on Campaign Analysis page

---

## Success Criteria

### Phase 1 Complete When:
- ✅ Enhanced tracking script deployed and logging data
- ✅ Page flow fields tracked (sequence, landing, previous_page)
- ✅ ClickHouse schema updated with page flow columns
- ✅ Real budget/cost data integrated
- ✅ Click counts showing in tracking links

### Phase 2 Complete When:
- ✅ All 7 analytics APIs functional
- ✅ APIs return real data from ClickHouse
- ✅ Date range filtering works
- ✅ Platform filtering works (Campaign Analysis)

### Phase 3 Complete When:
- ✅ All 7 pages connected to real APIs
- ✅ Charts render with real data
- ✅ No static/demo data remaining
- ✅ Loading states implemented

### Phase 4 Complete When:
- ✅ Performance optimizations applied
- ✅ Caching implemented
- ✅ Error handling comprehensive
- ✅ Production-ready

---

## Implementation Checklist

### Phase 1: Enhanced Data Collection
- [ ] Update ClickHouse schema with page flow columns
- [ ] Enhance cosmos-track.js with page sequence tracking
- [ ] Update /api/log to accept page flow fields
- [ ] Integrate real budget/cost data
- [ ] Add click counts to tracking links API

### Phase 2: Analytics APIs
- [ ] Build /api/analytics/performance
- [ ] Build /api/analytics/source-analysis
- [ ] Build /api/analytics/campaign-analysis
- [ ] Build /api/analytics/environment-analysis
- [ ] Build /api/analytics/time-analysis
- [ ] Build /api/analytics/returning-analysis
- [ ] Build /api/analytics/page-flow

### Phase 3: Frontend Integration
- [ ] Connect Performance Dashboard to API
- [ ] Connect Source & Media Analysis to API
- [ ] Connect Campaign Analysis to API
- [ ] Connect Environment Analysis to API
- [ ] Connect Time-based Analysis to API
- [ ] Connect Returning Visitor Analysis to API
- [ ] Connect Page Flow Analysis to API

### Phase 4: Optimization
- [ ] Add React memoization to all pages
- [ ] Implement server-side filtering
- [ ] Add data caching layer
- [ ] Implement loading/error states
- [ ] Add request debouncing
