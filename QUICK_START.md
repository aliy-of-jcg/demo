# 🚀 Quick Start Guide

Get your enhanced Admin Panel up and running in 5 minutes!

---

## 📋 Prerequisites

- Node.js 18+ installed
- Docker installed (for ClickHouse)
- Git (optional)

---

## 🎯 Setup Steps

### 1. Install Dependencies ✅ (Already Done!)

```bash
npm install
```

**Packages installed:**
- ✅ `ua-parser-js` - Advanced user-agent parsing
- ✅ `query-string` - Enhanced URL parsing
- ✅ `geoip-lite` - IP geolocation
- ✅ `swagger-ui-react` - API documentation
- ✅ `next-swagger-doc` - API documentation tools

---

### 2. Set Up ClickHouse

#### Option A: With Docker (Recommended)

```bash
# Start ClickHouse
docker-compose up -d

# Wait 10 seconds for ClickHouse to start
# Then run migration to create tables
npm run clickhouse:migrate
```

#### Option B: Existing ClickHouse

If you already have ClickHouse data:

```bash
# This will drop and recreate tables (WARNING: Data loss!)
npm run clickhouse:migrate
```

Or manually update schema to include new columns.

---

### 3. Configure Environment

Create `.env.local` in the root:

```env
CLICKHOUSE_HOST=http://localhost:8123
CLICKHOUSE_DATABASE=analytics
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### 4. Start Development Server

```bash
npm run dev
```

---

### 5. Access Your Application

Open your browser and visit:

| Page | URL | Description |
|------|-----|-------------|
| 🏠 **Dashboard** | http://localhost:3000 | Real-time analytics dashboard |
| 🔗 **Tracking Links** | http://localhost:3000/tracking | Generate tracking links |
| 📖 **API Docs** | http://localhost:3000/api-docs | Interactive API documentation |

---

## 🎨 Create Your First Tracking Link

### Via UI (Easy)

1. Go to http://localhost:3000/tracking
2. Fill in the form:
   - **Campaign Name**: "My First Campaign"
   - **Target URL**: "https://example.com"
   - **UTM Source**: "telegram"
   - **UTM Medium**: "social"
   - **UTM Campaign**: "test"
3. Click "Generate Tracking Link"
4. Copy and share the link!

### Via API (Advanced)

```bash
curl -X POST http://localhost:3000/api/tracking/generate \
  -H "Content-Type: application/json" \
  -d '{
    "campaignName": "My First Campaign",
    "targetUrl": "https://example.com",
    "utmSource": "telegram",
    "utmMedium": "social",
    "utmCampaign": "test"
  }'
```

---

## 🧪 Test Your Tracking

### 1. Click Your Tracking Link

Click the generated link from any device/browser.

### 2. View Analytics

Return to the dashboard: http://localhost:3000

You should see:
- ✅ Total Clicks: 1
- ✅ Unique Visitors: 1
- ✅ Device type detected
- ✅ Platform shown in pie chart

### 3. Check Detailed Data

In ClickHouse, run:

```sql
SELECT 
  device_type,
  device_vendor,
  device_model,
  browser,
  browser_version,
  os,
  os_version,
  app_name,
  country
FROM analytics.tracking_events
ORDER BY timestamp DESC
LIMIT 1;
```

You'll see rich data like:
- Device: "iPhone 14 Pro"
- Browser: "Safari 17.2"
- OS: "iOS 17.2.1"
- App: "Telegram" (if clicked from app)

---

## 📊 What's Being Tracked?

Every click captures **30+ data points**:

### 🎯 Campaign Data
- Campaign name
- Tracking code
- All UTM parameters

### 📱 Device Intelligence
- Device type (Mobile/Desktop/Tablet)
- Device vendor (Apple, Samsung, Google)
- Device model (iPhone 14 Pro, Galaxy S23)

### 🌐 Browser & OS
- Browser name and version
- OS name and version
- Rendering engine (WebKit, Blink)

### 🚀 Platform Detection
- Referrer URL and domain
- Known platform detection (Google, Naver, Kakao)
- Mobile app detection (Telegram, WhatsApp, etc.)

### 🤖 Bot Detection
- Identifies bots/crawlers
- Filters out non-human traffic

### 📍 Geolocation
- Country
- City
- Region
- Timezone

---

## 🎯 Common Use Cases

### 1. Telegram Campaign

```javascript
{
  campaignName: "Telegram Channel Promo",
  targetUrl: "https://yourstore.com/products",
  utmSource: "telegram",
  utmMedium: "social",
  utmCampaign: "winter_sale_2024"
}
```

Share in your Telegram channel. Track:
- Which devices your Telegram users use
- Mobile app vs web clicks
- Geographic distribution

### 2. Multi-Platform Campaign

Create separate links for each platform:

- **Kakao**: `utmSource: "kakao"`
- **Naver**: `utmSource: "naver"`
- **Email**: `utmSource: "email"`
- **Instagram**: `utmSource: "instagram"`

Compare performance in the dashboard!

### 3. A/B Testing

Test different ad creatives:

- **Banner A**: `utmContent: "banner_red"`
- **Banner B**: `utmContent: "banner_blue"`

See which performs better!

---

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start dev server

# ClickHouse
npm run clickhouse:init    # Initialize fresh database
npm run clickhouse:migrate # Migrate existing database
npm run clickhouse:seed    # Add sample data

# Build
npm run build            # Build for production
npm run start            # Start production server

# Linting
npm run lint             # Check code quality
```

---

## 📖 Documentation

### In This Project
- `INTEGRATION_SUMMARY.md` - Complete integration details
- `API_ENDPOINTS.md` - API reference guide
- `README.md` - Project overview
- `/api-docs` - Interactive API documentation

### External Resources
- [UAParser.js Docs](https://github.com/faisalman/ua-parser-js)
- [ClickHouse Docs](https://clickhouse.com/docs)
- [Next.js Docs](https://nextjs.org/docs)

---

## 🐛 Troubleshooting

### ClickHouse Not Starting?

```bash
# Check status
docker-compose ps

# View logs
docker-compose logs clickhouse

# Restart
docker-compose restart
```

### No Data Showing?

1. Check ClickHouse is running: `docker-compose ps`
2. Verify tables exist: `npm run clickhouse:migrate`
3. Check browser console for errors
4. Try clicking a tracking link

### API Docs Not Loading?

1. Clear browser cache
2. Ensure `swagger-ui-react` is installed
3. Check console for errors
4. Try: `npm install && npm run dev`

### Port 3000 Already in Use?

```bash
# Use different port
PORT=3001 npm run dev
```

Then access at http://localhost:3001

---

## ⚡ Performance Tips

### For High Traffic

1. **Enable ClickHouse Caching**
   - Add caching layer for `/api/analytics`
   - Use Redis for hot data

2. **Optimize Queries**
   - Add more indexes
   - Use materialized views
   - Aggregate data daily

3. **Scale ClickHouse**
   - Use ClickHouse cluster
   - Add more replicas
   - Partition by month

4. **CDN for Static Assets**
   - Use Vercel/Cloudflare
   - Cache dashboard assets
   - Optimize images

---

## 🎊 You're All Set!

Your admin panel now has:

✅ Advanced user-agent parsing (device models, browser versions)  
✅ Enhanced URL parsing (UTM parameters, referrers)  
✅ Mobile app detection (Telegram, Kakao, LINE, etc.)  
✅ Bot detection and filtering  
✅ GeoIP location tracking  
✅ Interactive API documentation  
✅ 30+ data points per click  

**Start tracking your campaigns and watch the insights roll in!** 🚀

---

## 📞 Need Help?

1. Check the documentation files
2. Visit http://localhost:3000/api-docs
3. Review ClickHouse logs
4. Check browser console

**Happy tracking!** 📊✨


