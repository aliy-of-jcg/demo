# 🏗️ System Architecture

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interaction                          │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js Frontend (React)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Dashboard   │  │   Tracking   │  │  API Docs    │          │
│  │   Page       │  │   Links      │  │  (Swagger)   │          │
│  │  (/          │  │  (/tracking) │  │  (/api-docs) │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js API Routes                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │/api/analytics│  │/api/tracking │  │   /track     │          │
│  │              │  │  /generate   │  │   (Route)    │          │
│  │  GET         │  │   POST       │  │    GET       │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Parsing Layer                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  UAParser.js         query-string      geoip-lite       │   │
│  │  (User Agent)        (URL Parsing)     (Geolocation)    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        ClickHouse                                │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  analytics.tracking_events                             │     │
│  │  - 30+ columns                                         │     │
│  │  - Partitioned by month                                │     │
│  │  - Indexed for fast queries                            │     │
│  └────────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  analytics.tracking_codes                              │     │
│  │  - Campaign metadata                                   │     │
│  │  - Link generation history                             │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### 1. Tracking Link Generation

```
User fills form → POST /api/tracking/generate
                       ↓
                  Generate tracking code
                       ↓
                  Store in tracking_codes table
                       ↓
                  Create tracking URL
                       ↓
                  Return to user
```

### 2. Click Tracking

```
User clicks link → GET /track?code=xyz&...
                       ↓
            Parse query parameters
                       ↓
        ┌──────────────┴──────────────┐
        ▼                             ▼
   Parse User Agent            Parse Referrer
   (UAParser.js)               (Custom Parser)
        │                             │
        ├─► Device info               ├─► Platform detection
        ├─► Browser & version         └─► Known source check
        ├─► OS & version
        ├─► Mobile app detection
        └─► Bot detection
                       │
                       ▼
                Get GeoLocation
                 (geoip-lite)
                       │
                       ▼
          Insert into tracking_events
                       ↓
              Redirect to target URL
```

### 3. Analytics Retrieval

```
Dashboard loads → GET /api/analytics?days=7
                       ↓
         Query ClickHouse for:
         - Total stats
         - Daily clicks
         - Platform distribution
         - Device breakdown
         - Top campaigns
                       ↓
         Aggregate & format data
                       ↓
         Return JSON response
                       ↓
         Render charts (Recharts)
```

---

## 📁 File Structure

```
demo/
├── app/
│   ├── page.tsx                    # Dashboard (with auto-refresh)
│   ├── layout.tsx                  # Root layout with sidebar
│   ├── globals.css                 # Global styles
│   │
│   ├── tracking/
│   │   └── page.tsx               # Tracking link generator
│   │
│   ├── api-docs/
│   │   └── page.tsx               # Swagger UI documentation
│   │
│   ├── api/
│   │   ├── analytics/
│   │   │   └── route.ts           # Analytics data endpoint
│   │   │
│   │   └── tracking/
│   │       └── generate/
│   │           └── route.ts       # Link generation endpoint
│   │
│   └── track/
│       └── route.ts               # Click tracking & redirect
│
├── components/
│   ├── sidebar.tsx                # Navigation sidebar
│   └── ui/                        # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       └── ...
│
├── lib/
│   ├── clickhouse.ts             # ClickHouse client & schema
│   ├── user-agent.ts             # UAParser.js wrapper
│   ├── url-parser.ts             # URL & referrer parsing
│   ├── utils.ts                  # Utility functions
│   └── api-spec.ts               # OpenAPI specification
│
├── scripts/
│   ├── init-clickhouse.js        # Initialize fresh DB
│   ├── seed-data.js              # Add sample data
│   └── migrate-clickhouse.js     # Migrate schema
│
├── .env.local                    # Environment variables
├── docker-compose.yml            # ClickHouse container
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript config
├── tailwind.config.ts            # Tailwind CSS config
│
└── Documentation/
    ├── README.md                 # Project overview
    ├── INTEGRATION_SUMMARY.md    # Complete integration guide
    ├── API_ENDPOINTS.md          # API reference
    ├── QUICK_START.md            # Quick setup guide
    └── SYSTEM_ARCHITECTURE.md    # This file
```

---

## 🔌 Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **Recharts** - Data visualization
- **Lucide React** - Icons

### Backend
- **Next.js API Routes** - RESTful API
- **ClickHouse** - Analytics database
- **Docker** - Containerization

### Parsing & Analytics
- **UAParser.js** - User-agent parsing
- **query-string** - URL parameter parsing
- **geoip-lite** - IP geolocation
- **nanoid** - ID generation

### Documentation
- **Swagger UI React** - Interactive API docs
- **OpenAPI 3.0** - API specification

---

## 🗄️ Database Schema

### Table: `analytics.tracking_events`

**Partitioning**: By month (YYYYMM)  
**Ordering**: (created_date, tracking_code, timestamp)  
**Engine**: MergeTree

```sql
CREATE TABLE analytics.tracking_events (
  -- Identity
  id String,
  tracking_code String,
  campaign_name String,
  
  -- UTM Parameters (5 columns)
  utm_source String,
  utm_medium String,
  utm_campaign String,
  utm_content String,
  utm_term String,
  
  -- Referrer Data (4 columns)
  referrer String,
  referrer_domain String,
  referrer_source String,
  referrer_is_known UInt8,
  
  -- User Data (2 columns)
  ip_address String,
  user_agent String,
  
  -- Device Info (3 columns)
  device_type String,
  device_vendor String,
  device_model String,
  
  -- Browser Info (2 columns)
  browser String,
  browser_version String,
  
  -- OS Info (2 columns)
  os String,
  os_version String,
  
  -- Engine (1 column)
  engine String,
  
  -- App Detection (3 columns)
  is_mobile_app UInt8,
  app_name String,
  is_bot UInt8,
  
  -- Location (4 columns)
  country String,
  city String,
  region String,
  timezone String,
  
  -- Timestamps (2 columns)
  timestamp DateTime DEFAULT now(),
  created_date Date DEFAULT toDate(timestamp)
)
```

**Total**: 31 columns of rich analytics data per click!

### Table: `analytics.tracking_codes`

Stores metadata about generated tracking links.

```sql
CREATE TABLE analytics.tracking_codes (
  id String,
  tracking_code String,
  campaign_name String,
  target_url String,
  description String,
  created_by String,
  created_at DateTime DEFAULT now(),
  is_active UInt8 DEFAULT 1
)
```

---

## 🔄 Request Flow Examples

### Example 1: Dashboard Load

```
1. Browser → GET /
2. Next.js renders Dashboard page
3. Dashboard → GET /api/analytics?days=7
4. API queries ClickHouse:
   - Total clicks/visitors
   - Daily aggregations
   - Platform distribution
   - Device breakdown
   - Top campaigns
5. ClickHouse returns results
6. API formats & returns JSON
7. Dashboard renders charts with Recharts
8. Auto-refresh every 10 seconds
```

### Example 2: Generate Tracking Link

```
1. User fills form on /tracking
2. Form → POST /api/tracking/generate
   Body: {
     campaignName: "Summer Sale",
     targetUrl: "https://store.com/sale",
     utmSource: "telegram",
     utmMedium: "social",
     utmCampaign: "summer_2024"
   }
3. API generates tracking code (nanoid)
4. API stores in tracking_codes table
5. API creates tracking URL:
   http://localhost:3000/track?code=xyz&utm_source=telegram&...&r=base64
6. API returns tracking link
7. User copies and shares link
```

### Example 3: User Clicks Tracking Link

```
1. User clicks: /track?code=xyz&utm_source=telegram&...
2. API receives request
3. API extracts:
   - Headers: User-Agent, Referer, IP
   - Query: code, UTM params, redirect URL
4. UAParser.js parses User-Agent:
   - Device: iPhone 14 Pro
   - Browser: Safari 17.2
   - OS: iOS 17.2.1
   - App: Telegram
5. url-parser.ts parses referrer:
   - Domain: t.me
   - Platform: Telegram
   - Known: Yes
6. geoip-lite resolves IP:
   - Country: US
   - City: New York
   - Timezone: America/New_York
7. API inserts all data into tracking_events
8. API redirects user to target URL
9. User sees target website
10. Dashboard updates (next refresh)
```

---

## ⚡ Performance Optimizations

### Frontend
- Client-side caching (React state)
- Debounced auto-refresh
- Lazy loading of charts
- Code splitting (Next.js automatic)

### API
- Efficient ClickHouse queries
- Proper indexing
- Background data insertion (setImmediate)
- Graceful error handling

### Database
- Monthly partitioning (reduces query time)
- Composite indexes (fast lookups)
- MergeTree engine (optimized for analytics)
- Compression (saves storage)

---

## 🔐 Security Considerations

### Current State
- ✅ Type-safe TypeScript
- ✅ Input validation
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection (React escaping)

### Production Recommendations
- 🔒 Add API authentication (JWT/API keys)
- 🔒 Rate limiting (prevent abuse)
- 🔒 CORS configuration
- 🔒 HTTPS enforcement
- 🔒 IP whitelisting (for admin endpoints)
- 🔒 CSP headers
- 🔒 Audit logging

---

## 📊 Scalability

### Current Capacity
- **Clicks**: ~10,000/day
- **Users**: 100+ concurrent
- **Storage**: Growing ~1GB/month

### When to Scale

**Frontend**: 
- Use CDN (Vercel, Cloudflare)
- Add caching layer (Redis)

**API**:
- Load balancer (multiple Next.js instances)
- Queue for background jobs (BullMQ)

**Database**:
- ClickHouse cluster (horizontal scaling)
- Add replicas (redundancy)
- Materialized views (faster queries)

---

## 🎯 Key Features

✅ **Real-time Tracking**: Instant click recording  
✅ **Rich Analytics**: 30+ data points per click  
✅ **Device Intelligence**: Vendor, model, versions  
✅ **Platform Detection**: Known sources (Google, Naver, etc.)  
✅ **App Detection**: Telegram, Kakao, LINE, WhatsApp  
✅ **Bot Filtering**: Identify and filter bots  
✅ **Geolocation**: Country, city, timezone  
✅ **Auto-refresh Dashboard**: Real-time updates  
✅ **Interactive API Docs**: Swagger UI  
✅ **Easy Link Generation**: Simple form interface  
✅ **UTM Support**: Full campaign tracking  

---

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run start
```

### Docker Deployment
```bash
docker-compose up -d
```

### Cloud Platforms
- **Vercel**: Frontend deployment
- **Railway**: ClickHouse hosting
- **DigitalOcean**: Full stack deployment
- **AWS**: Scalable infrastructure

---

## 📈 Future Enhancements

- [ ] A/B testing support
- [ ] Heatmap visualization
- [ ] Funnel analysis
- [ ] Cohort analysis
- [ ] Email reports
- [ ] Webhook integrations
- [ ] Custom dashboards
- [ ] Multi-user support
- [ ] Role-based access
- [ ] API rate limiting
- [ ] Data export (CSV, Excel)
- [ ] Real-time WebSocket updates

---

This architecture provides a solid foundation for scalable analytics tracking! 🎊



