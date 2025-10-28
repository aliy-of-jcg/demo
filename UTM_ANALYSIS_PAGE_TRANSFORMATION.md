# ✅ UTM별 상세 분석 Page - Complete Transformation

## 🎯 Objective

Transform the "Page Flow Analysis" page to match the "UTM별 상세 분석 (UTM Performance Detail Analysis)" specification from the provided image.

---

## 📊 Changes Summary

### **Before (Old "Page Flow Analysis")** ❌
- 3 summary cards (Avg Session Depth, Bounce Rate, Total Sessions)
- Pie chart for session depth distribution
- Landing pages table with wrong columns (Sessions, Visitors, Conversions, Conv Rate, Avg Time)
- Exit pages table with wrong columns (Sessions, Visitors, Avg Time)
- Navigation patterns table (not needed)
- Popular pages table (not needed)
- No UTM breakdown chart

### **After (New "UTM별 상세 분석")** ✅
- **4 summary cards** (총 세션수, 총 페이지뷰, 평균 페이지뷰, 주요 랜딩수)
- **UTM bar chart** comparing average pageviews by UTM source (Naver, Kakao, Google, YouTube, etc.)
- **Landing pages table** with correct columns (페이지명, 방문수, 평균 페이지뷰, 이탈률, 평균 체류시간)
- **Exit pages table** with correct columns (페이지명, 이탈수, 이탈률)
- Removed: pie chart, navigation patterns, popular pages
- Korean UI labels with English subtitles

---

## 🔧 Technical Implementation

### **1. API Route Changes** (`app/api/analytics/page-flow-analysis/route.ts`)

#### Added Queries:

**A. Total Pageviews**
```sql
SELECT COUNT(*) as total_pageviews
FROM analytics.visit_logs
WHERE ${whereClause}
```

**B. UTM Breakdown**
```sql
SELECT 
  CASE 
    WHEN utm_source = '' THEN 'Direct'
    ELSE utm_source
  END as utm_source,
  COUNT(DISTINCT session_id) as total_sessions,
  COUNT(*) as total_pageviews,
  ROUND(COUNT(*) / COUNT(DISTINCT session_id), 2) as avg_pageviews_per_session
FROM analytics.visit_logs
WHERE ${whereClause}
GROUP BY utm_source
HAVING total_sessions > 0
ORDER BY total_sessions DESC
```

**C. Landing Pages (Updated)**
```sql
WITH session_stats AS (
  SELECT 
    session_id,
    MIN(page_url) as landing_page,
    COUNT(*) as pages_in_session,
    SUM(time_on_page) as total_time
  FROM analytics.visit_logs
  WHERE ${whereClause}
  GROUP BY session_id
)
SELECT 
  landing_page as page_url,
  COUNT(*) as visits,
  ROUND(AVG(pages_in_session), 2) as avg_pageviews,
  ROUND(countIf(pages_in_session = 1) / COUNT(*) * 100, 1) as bounce_rate,
  ROUND(AVG(total_time), 0) as avg_time_on_page
FROM session_stats
GROUP BY landing_page
ORDER BY visits DESC
```

**D. Exit Pages (Updated)**
```sql
WITH total_sessions AS (
  SELECT COUNT(DISTINCT session_id) as cnt
  FROM analytics.visit_logs
  WHERE ${whereClause}
)
SELECT 
  page_url,
  COUNT(*) as exits,
  ROUND(COUNT(*) / (SELECT cnt FROM total_sessions) * 100, 1) as exit_rate
FROM analytics.visit_logs
WHERE ${whereClause}
  AND is_exit_page = 1
GROUP BY page_url
ORDER BY exits DESC
```

#### New Response Structure:
```typescript
{
  success: true,
  landingPages: PageData[],      // Updated structure
  exitPages: ExitPageData[],      // Updated structure
  utmBreakdown: UTMBreakdown[],  // NEW
  insights: {
    totalSessions: number,
    totalPageviews: number,              // NEW
    avgPageviewsPerSession: string,      // NEW
    uniqueLandingPagesCount: number,     // NEW
    avgSessionDepth: string
  }
}
```

#### Removed Queries:
- Navigation patterns
- Popular pages
- Depth distribution
- Bounce rate calculation

---

### **2. Frontend Changes** (`app/page-flow-analysis/page.tsx`)

#### A. Updated Interfaces
```typescript
interface PageData {
  page: string;
  visits: number;           // Changed from sessions
  avgPageviews: number;     // NEW
  bounceRate: number;       // NEW (now calculated)
  avgTimeOnPage: number;
}

interface ExitPageData {
  page: string;
  exits: number;            // NEW
  exitRate: number;         // NEW (now calculated)
}

interface UTMBreakdown {    // NEW
  utm_source: string;
  total_sessions: number;
  total_pageviews: number;
  avg_pageviews_per_session: number;
}
```

#### B. 4 Summary Cards
```tsx
<div className="grid grid-cols-4 gap-4 mb-6">
  {/* 총 세션수 - Blue */}
  <div className="bg-gradient-to-br from-blue-50 to-blue-100...">
    <h3>총 세션수</h3>
    <p>{totalSessions}</p>
  </div>
  
  {/* 총 페이지뷰 - Purple */}
  <div className="bg-gradient-to-br from-purple-50 to-purple-100...">
    <h3>총 페이지뷰</h3>
    <p>{totalPageviews}</p>
  </div>
  
  {/* 평균 페이지뷰 - Green */}
  <div className="bg-gradient-to-br from-green-50 to-green-100...">
    <h3>평균 페이지뷰</h3>
    <p>{avgPageviewsPerSession}</p>
  </div>
  
  {/* 주요 랜딩수 - Orange */}
  <div className="bg-gradient-to-br from-orange-50 to-orange-100...">
    <h3>주요 랜딩수</h3>
    <p>{uniqueLandingPagesCount}</p>
  </div>
</div>
```

#### C. UTM Bar Chart (NEW)
```tsx
<div className="bg-white p-6 rounded-lg...">
  <h2>UTM별 평균 페이지뷰 비교</h2>
  <ResponsiveContainer width="100%" height={350}>
    <BarChart data={data.utmBreakdown}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="utm_source" />
      <YAxis label="평균 페이지뷰" />
      <Tooltip />
      <Bar 
        dataKey="avg_pageviews_per_session" 
        fill="#3b82f6"
        radius={[8, 8, 0, 0]}
      />
    </BarChart>
  </ResponsiveContainer>
</div>
```

#### D. Landing Pages Table (Updated Columns)
```tsx
<thead>
  <tr>
    <th>페이지명</th>          {/* Page Name */}
    <th>방문수</th>            {/* Visits */}
    <th>평균 페이지뷰</th>      {/* Avg Pageviews */}
    <th>이탈률</th>            {/* Bounce Rate */}
    <th>평균 체류시간</th>      {/* Avg Time */}
  </tr>
</thead>
<tbody>
  {landingPages.map(page => (
    <tr>
      <td>{page.page}</td>
      <td>{page.visits.toLocaleString()}</td>
      <td>{page.avgPageviews.toFixed(2)}</td>
      <td>
        <span className={page.bounceRate > 70 ? 'text-red-600' : ''}>
          {page.bounceRate.toFixed(1)}%
        </span>
      </td>
      <td>{formatTime(page.avgTimeOnPage)}</td>
    </tr>
  ))}
</tbody>
```

#### E. Exit Pages Table (Updated Columns)
```tsx
<thead>
  <tr>
    <th>페이지명</th>          {/* Page Name */}
    <th>이탈수</th>            {/* Exits */}
    <th>이탈률</th>            {/* Exit Rate */}
  </tr>
</thead>
<tbody>
  {exitPages.map(page => (
    <tr>
      <td>{page.page}</td>
      <td>{page.exits.toLocaleString()}</td>
      <td>
        <span className={page.exitRate > 50 ? 'text-red-600' : ''}>
          {page.exitRate.toFixed(1)}%
        </span>
      </td>
    </tr>
  ))}
</tbody>
```

#### F. Helper Functions
```typescript
// Format seconds to Korean time format
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}분 ${secs}초`;
};
```

#### G. Removed Components
- ❌ Pie chart (Session Depth Distribution)
- ❌ Navigation Patterns table
- ❌ Popular Pages table
- ❌ Depth distribution cards

---

## 🎨 UI/UX Improvements

### Color Coding
- **Blue** → 총 세션수 (Total Sessions)
- **Purple** → 총 페이지뷰 (Total Pageviews)
- **Green** → 평균 페이지뷰 (Avg Pageviews)
- **Orange** → 주요 랜딩수 (Main Landing Pages)

### Data Highlighting
- **Bounce Rate > 70%** → Red text
- **Exit Rate > 50%** → Red text
- **Visit counts** → Blue text
- **Exit counts** → Orange text

### Korean + English Labels
- Primary labels in Korean (한글)
- Subtitle labels in English for clarity
- Button text in Korean (최근 7일, 최근 30일, 최근 3개월)

---

## 📈 Data Calculation Logic

### Average Pageviews per Session
```typescript
avgPageviewsPerSession = totalPageviews / totalSessions
```

### Bounce Rate (Landing Pages)
```sql
ROUND(countIf(pages_in_session = 1) / COUNT(*) * 100, 1)
```
- Sessions with only 1 page view ÷ Total sessions × 100

### Exit Rate
```sql
ROUND(COUNT(*) / total_sessions * 100, 1)
```
- Number of exits from this page ÷ Total sessions × 100

### Average Time on Page
```sql
ROUND(AVG(time_on_page), 0)
```
- Average of all `time_on_page` values in seconds

---

## ✅ Verification Checklist

- [x] 4 summary cards display correct metrics
- [x] UTM bar chart shows all UTM sources
- [x] Landing pages table has 5 correct columns
- [x] Exit pages table has 3 correct columns
- [x] Bounce rate calculated and displayed
- [x] Exit rate calculated and displayed
- [x] Time format is Korean (X분 Y초)
- [x] High bounce/exit rates highlighted in red
- [x] Removed pie chart
- [x] Removed navigation patterns
- [x] Removed popular pages
- [x] Date range filters work
- [x] Quick range buttons in Korean
- [x] No linter errors
- [x] TypeScript interfaces updated

---

## 🔄 Comparison with Image Specification

### From Your Image:
| Requirement | Status |
|-------------|--------|
| Date range filters | ✅ Implemented |
| 총 세션수 card | ✅ Implemented |
| 총 페이지뷰 card | ✅ Implemented |
| 평균 페이지뷰 card | ✅ Implemented |
| 주요 랜딩수 card | ✅ Implemented |
| UTM bar chart (Naver/Kakao/Google/YouTube) | ✅ Implemented |
| Landing pages table with 5 columns | ✅ Implemented |
| Exit pages table with 3 columns | ✅ Implemented |
| Korean labels | ✅ Implemented |
| Bounce rate calculation | ✅ Implemented |
| Exit rate calculation | ✅ Implemented |

---

## 🚀 How to Test

1. **Navigate to the page:**
   ```
   http://localhost:3000/page-flow-analysis
   ```

2. **Verify 4 summary cards display:**
   - 총 세션수 (blue)
   - 총 페이지뷰 (purple)
   - 평균 페이지뷰 (green)
   - 주요 랜딩수 (orange)

3. **Check UTM bar chart:**
   - Should show different UTM sources on X-axis
   - Y-axis shows average pageviews per session
   - Hover to see detailed tooltips

4. **Verify landing pages table:**
   - Columns: 페이지명, 방문수, 평균 페이지뷰, 이탈률, 평균 체류시간
   - Bounce rates > 70% should be red
   - Time format: "X분 Y초"

5. **Verify exit pages table:**
   - Columns: 페이지명, 이탈수, 이탈률
   - Exit rates > 50% should be red

6. **Test date filters:**
   - Use date pickers
   - Click quick range buttons (최근 7일, 최근 30일, 최근 3개월)

---

## 📝 Files Modified

1. **`app/api/analytics/page-flow-analysis/route.ts`**
   - Added total pageviews query
   - Added UTM breakdown query
   - Updated landing pages query (new columns)
   - Updated exit pages query (new columns)
   - Removed navigation patterns query
   - Removed popular pages query
   - Updated response structure

2. **`app/page-flow-analysis/page.tsx`**
   - Updated TypeScript interfaces
   - Changed from 3 to 4 summary cards
   - Added UTM bar chart component
   - Updated landing pages table (5 columns)
   - Updated exit pages table (3 columns)
   - Added `formatTime()` helper function
   - Removed pie chart
   - Removed navigation patterns section
   - Removed popular pages section
   - Updated Korean labels

---

## 🎯 Result

The page now **perfectly matches** the "UTM별 상세 분석" specification:
- ✅ Correct 4-card layout
- ✅ UTM comparison bar chart
- ✅ Landing pages with bounce rate & avg pageviews
- ✅ Exit pages with exit rate
- ✅ Korean UI with English subtitles
- ✅ Clean, focused analytics view
- ✅ No unnecessary sections

**Status:** ✅ Complete & Tested

