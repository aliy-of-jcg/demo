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

## 🔐 Authentication Endpoints

### POST `/api/auth/login`

Authenticate user and return JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "uuid": "user-uuid",
    "email": "user@example.com",
    "company_name": "Company Name",
    "contact_number": "+1234567890",
    "user_type": "admin"
  },
  "token": "jwt-token-here"
}
```

### POST `/api/auth/signup`

Create a new user account.

**Request Body:**
```json
{
  "company_name": "Company Name",
  "email": "user@example.com",
  "password": "password123",
  "contact_number": "+1234567890",
  "user_type": "admin"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account created successfully!",
  "user": {
    "id": 1,
    "uuid": "user-uuid",
    "email": "user@example.com",
    "company_name": "Company Name",
    "user_type": "admin"
  },
  "token": "jwt-token-here"
}
```

### POST `/api/auth/logout`

Logout user (invalidate token).

### POST `/api/auth/forgot-password`

Request password reset.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

### POST `/api/auth/reset-password`

Reset password with token.

**Request Body:**
```json
{
  "token": "reset-token",
  "password": "newpassword123"
}
```

### GET `/api/auth/validate`

Validate JWT token.

**Headers:**
```
Authorization: Bearer jwt-token-here
```

---

## 📊 Campaign Management

### GET `/api/campaigns`

Get all campaigns with analytics data.

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Items per page
- `search` (optional) - Search by name or course
- `source` (optional) - Filter by UTM source
- `medium` (optional) - Filter by UTM medium
- `status` (optional) - Filter by status
- `course_id` (optional) - Filter by course
- `start_date` (optional) - Filter by start date
- `end_date` (optional) - Filter by end date
- `sort_by` (optional, default: created_at) - Sort field
- `sort_order` (optional, default: DESC) - Sort direction

**Response:**
```json
{
  "success": true,
  "campaigns": [
    {
      "id": 1,
      "name": "Summer Sale 2024",
      "course_id": 1,
      "source": "telegram",
      "medium": "social",
      "status": "active",
      "start_date": "2024-01-01",
      "end_date": "2024-12-31",
      "budget": 10000,
      "spent": 2500,
      "description": "Summer campaign",
      "created_at": "2024-01-15T10:30:00.000Z",
      "course_name": "Digital Marketing",
      "platforms": [
        {
          "utm_source": "telegram",
          "utm_medium": "social"
        }
      ],
      "tracking_code": "ABC123",
      "tracking_codes": ["ABC123", "DEF456"],
      "clicks": 150,
      "visitors": 120,
      "ctr": "80.0",
      "conversion_rate": "80.0"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  },
  "summary": {
    "total_campaigns": 25,
    "active_campaigns": 20,
    "total_budget": 250000,
    "total_spent": 50000,
    "total_clicks": 1500,
    "total_visitors": 1200,
    "avg_conversion_rate": 80.0
  }
}
```

### POST `/api/campaigns`

Create a new campaign.

**Request Body:**
```json
{
  "name": "Summer Sale 2024",
  "course_id": 1,
  "source": "telegram",
  "medium": "social",
  "status": "active",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "budget": 10000,
  "description": "Summer campaign",
  "landing_url": "https://example.com/landing",
  "utm_campaign": "summer_2024",
  "utm_source": "telegram",
  "utm_medium": "social",
  "utm_term": "running shoes",
  "utm_content": "banner_ad"
}
```

---

## 📚 Course Management

### GET `/api/courses`

Get all courses with analytics data.

**Query Parameters:**
- `search` (optional) - Search by name or code
- `status` (optional) - Filter by status

**Response:**
```json
{
  "success": true,
  "courses": [
    {
      "id": 1,
      "name": "Digital Marketing",
      "code": "DM101",
      "category": "Marketing",
      "duration": "12 weeks",
      "price": 299,
      "status": "active",
      "active_campaigns": 5,
      "total_visits": 1200
    }
  ],
  "summary": {
    "total_courses": 10,
    "active_courses": 8,
    "total_campaigns": 25,
    "total_visits": 5000
  }
}
```

### POST `/api/courses`

Create a new course.

**Request Body:**
```json
{
  "name": "Digital Marketing",
  "code": "DM101",
  "category": "Marketing",
  "duration": "12 weeks",
  "price": 299,
  "status": "active"
}
```

---

## 📈 Performance Analytics

### GET `/api/performance`

Get comprehensive performance metrics.

**Query Parameters:**
- `start_date` (optional, default: 30 days ago) - Start date (YYYY-MM-DD)
- `end_date` (optional, default: today) - End date (YYYY-MM-DD)
- `campaign_id` (optional) - Filter by campaign
- `course_id` (optional) - Filter by course

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_visits": 1500,
      "unique_visitors": 1200,
      "total_conversions": 300,
      "conversion_rate": 20.0,
      "ctr": 80.0,
      "avg_cpa": 5000,
      "total_cost": 1500000,
      "avg_time_on_page": 180,
      "new_visitors": 800
    },
    "daily_trend": [
      {
        "date": "2024-01-15",
        "visits": 100,
        "unique_visitors": 80,
        "conversions": 20,
        "avg_time": 180,
        "cost": 75000
      }
    ],
    "source_performance": [
      {
        "source": "telegram",
        "visits": 800,
        "unique_visitors": 650,
        "conversions": 150,
        "avg_time": 200,
        "cost": 400000,
        "cpa": 2667,
        "conversion_rate": 18.75
      }
    ]
  }
}
```

---

## 🔗 UTM Code Management

### GET `/api/utm-codes`

Get all UTM codes with analytics.

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Items per page
- `campaign_id` (optional) - Filter by campaign
- `search` (optional) - Search by name or code

### POST `/api/utm-codes`

Create a new UTM code.

**Request Body:**
```json
{
  "name": "telegram_social_summer",
  "campaign_id": 1,
  "utm_source": "telegram",
  "utm_medium": "social",
  "utm_campaign": "summer_2024",
  "utm_term": "running shoes",
  "utm_content": "banner_ad"
}
```

---

## 🏥 Health & Monitoring

### GET `/api/health`

Application health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600
}
```

---

## 🔐 Authentication (Production Considerations)

For production use, consider adding:
- API key authentication
- JWT token validation
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



