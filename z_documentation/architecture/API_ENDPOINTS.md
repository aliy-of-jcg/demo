# API Endpoints Reference

Quick reference guide for all API endpoints in the Admin Panel Analytics System.

---

## 📊 Analytics Endpoints

### GET `/api/analytics`

Retrieve comprehensive analytics data for the dashboard.

**Query Parameters:**
- `days` (optional, default: 7) - Number of days to retrieve data for

**Example Request:**
```bash
curl http://localhost:3000/api/analytics?days=30
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "total_clicks": 1234,
      "unique_visitors": 567,
      "active_campaigns": 8
    },
    "clicks": [
      {
        "date": "2024-01-15",
        "clicks": 120,
        "conversions": 45
      }
    ],
    "platforms": [
      {
        "name": "telegram",
        "value": 450,
        "color": "#0088cc"
      }
    ],
    "devices": [
      {
        "device": "Mobile",
        "visits": 800
      }
    ],
    "campaigns": [
      {
        "name": "Summer Sale 2024",
        "clicks": 234,
        "ctr": "18.9%"
      }
    ]
  }
}
```

---

## 🔗 Tracking Endpoints

### POST `/api/tracking/generate`

Generate a new tracking link with UTM parameters.

**Request Body:**
```json
{
  "campaignName": "Summer Sale 2024",
  "targetUrl": "https://yourwebsite.com/landing",
  "utmSource": "telegram",
  "utmMedium": "social",
  "utmCampaign": "summer_sale",
  "utmContent": "banner_ad",      // optional
  "utmTerm": "running shoes"       // optional
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/tracking/generate \
  -H "Content-Type: application/json" \
  -d '{
    "campaignName": "Summer Sale 2024",
    "targetUrl": "https://yourwebsite.com/landing",
    "utmSource": "telegram",
    "utmMedium": "social",
    "utmCampaign": "summer_sale"
  }'
```

**Response:**
```json
{
  "success": true,
  "trackingLink": {
    "id": "abc123xyz",
    "campaignName": "Summer Sale 2024",
    "trackingCode": "xyz789abc",
    "targetUrl": "https://yourwebsite.com/landing",
    "utmSource": "telegram",
    "utmMedium": "social",
    "utmCampaign": "summer_sale",
    "fullUrl": "http://localhost:3000/track?code=xyz789abc&utm_source=telegram&utm_medium=social&utm_campaign=summer_sale&r=aHR0cHM6Ly95b3Vyd2Vic2l0ZS5jb20vbGFuZGluZw==",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### GET `/track`

Track a click event and redirect to the target URL.

**Query Parameters:**
- `code` (required) - Tracking code
- `r` (optional) - Base64 encoded redirect URL
- `redirect` (optional) - URL-encoded redirect URL
- `utm_source` (optional) - Traffic source
- `utm_medium` (optional) - Marketing medium
- `utm_campaign` (optional) - Campaign name
- `utm_content` (optional) - Content identifier
- `utm_term` (optional) - Search keywords

**Example:**
```
http://localhost:3000/track?code=xyz789abc&utm_source=telegram&utm_medium=social&utm_campaign=summer_sale&r=aHR0cHM6Ly95b3Vyd2Vic2l0ZS5jb20vbGFuZGluZw==
```

**Behavior:**
1. Records click event with full device/browser/location data
2. Redirects user to target URL with UTM parameters appended
3. Returns 302 redirect response

**Tracked Data:**
- Device type, vendor, model
- Browser and version
- OS and version
- Referrer and source
- IP and geolocation
- Mobile app detection
- Bot detection
- Timestamp

---

## 🔧 Data Collected Per Click

When a user clicks a tracking link, the following data is automatically collected and stored in ClickHouse:

| Category | Fields |
|----------|--------|
| **Campaign** | tracking_code, campaign_name |
| **UTM** | utm_source, utm_medium, utm_campaign, utm_content, utm_term |
| **Referrer** | referrer, referrer_domain, referrer_source, referrer_is_known |
| **Device** | device_type, device_vendor, device_model |
| **Browser** | browser, browser_version, engine |
| **OS** | os, os_version |
| **Detection** | is_mobile_app, app_name, is_bot |
| **Location** | country, city, region, timezone |
| **User** | ip_address, user_agent |
| **Time** | timestamp, created_date |

---

## 📖 API Documentation

For interactive API testing and detailed documentation, visit:

**http://localhost:3000/api-docs**

Features:
- ✅ Try endpoints directly in browser
- ✅ See request/response schemas
- ✅ Example values for all fields
- ✅ Parameter descriptions
- ✅ Error response formats

---

## 🔐 Authentication (Future Enhancement)

Currently, the API is open. For production use, consider adding:
- API key authentication
- JWT tokens
- Rate limiting
- IP whitelisting

---

## 📝 Example Use Cases

### 1. Create Telegram Campaign Link

```javascript
const response = await fetch('/api/tracking/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    campaignName: 'Telegram Spring Campaign',
    targetUrl: 'https://yourstore.com/spring-sale',
    utmSource: 'telegram',
    utmMedium: 'social',
    utmCampaign: 'spring_2024',
  })
});

const { trackingLink } = await response.json();
console.log('Share this link:', trackingLink.fullUrl);
```

### 2. Get Last 30 Days Analytics

```javascript
const response = await fetch('/api/analytics?days=30');
const { data } = await response.json();

console.log('Total Clicks:', data.stats.total_clicks);
console.log('Top Platform:', data.platforms[0].name);
console.log('Most Popular Device:', data.devices[0].device);
```

### 3. Track Custom Event (via redirect)

```
https://yourapp.com/track?code=ABC123&utm_source=email&utm_medium=newsletter&utm_campaign=weekly_digest&redirect=https://blog.yoursite.com/article
```

---

## 🚀 Rate Limits (Recommended for Production)

| Endpoint | Recommended Limit |
|----------|------------------|
| `/api/analytics` | 100 requests/minute |
| `/api/tracking/generate` | 50 requests/minute |
| `/track` | No limit (user clicks) |

---

## 📊 Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 302 | Redirect (tracking successful) |
| 400 | Bad Request (missing parameters) |
| 500 | Server Error (ClickHouse unavailable) |

---

## 🎯 Best Practices

1. **Always use HTTPS in production**
2. **URL-encode special characters in targetUrl**
3. **Use consistent UTM naming conventions**
4. **Monitor `/api/analytics` for bot traffic**
5. **Set up alerts for unusual spikes**

---

## 📞 Support

For issues or questions:
- Check `/api-docs` for interactive documentation
- Review `INTEGRATION_SUMMARY.md` for setup details
- Check ClickHouse logs: `docker-compose logs clickhouse`



