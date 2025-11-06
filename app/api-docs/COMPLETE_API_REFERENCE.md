# CosMos AI - Complete API Reference

This document provides a comprehensive overview of all 30 active API endpoints in the CosMos AI Analytics & Tracking System.

## Quick Stats
- **Total Active APIs:** 30
- **API Categories:** 7
- **Version:** 2.0.0
- **Last Updated:** January 6, 2025

## API Endpoints by Category

### 1. Authentication APIs (7 endpoints)

All authentication endpoints include comprehensive error handling and security measures.

#### POST `/api/auth/login`
- **Purpose:** User login with email and password
- **Returns:** JWT token and user information
- **Console Log:** `🔐 Login API - Email: ${email}`

#### POST `/api/auth/signup`
- **Purpose:** Create new user account
- **Validation:** Email format, password length (min 6), user type restrictions
- **Console Log:** `📝 Signup API - Email: ${email}, Company: ${company_name}`

#### POST `/api/auth/logout`
- **Purpose:** Logout user and invalidate session
- **Returns:** Success message

#### POST `/api/auth/validate`
- **Purpose:** Validate JWT token and return user info
- **Security:** Checks user status and token validity

#### POST `/api/auth/forgot-password`
- **Purpose:** Request password reset email
- **Rate Limit:** 3 attempts per hour
- **Console Log:** `🔑 Forgot Password API - Email: ${email}`

#### POST `/api/auth/reset-password`
- **Purpose:** Reset password using token from email
- **Rate Limit:** 5 attempts per hour
- **Console Log:** `🔐 Reset Password API - Token: ${token.substring(0, 10)}...`

#### POST `/api/auth/reset-password/validate`
- **Purpose:** Validate password reset token before showing reset form
- **Rate Limit:** 10 attempts per hour

---

### 2. Campaign APIs (4 core + 4 extended = 8 endpoints)

#### GET `/api/campaigns`
- **Purpose:** Get all campaigns with analytics
- **Features:**
  - Pagination support
  - Search by name/course
  - Filter by source, medium, status, course_id, dates
  - Aggregated clicks and visitors from ClickHouse
  - Auto-calculated spent ($0.50 per click - demo feature)
- **Console Log:** `📋 Campaigns API - Page: ${page}, Limit: ${limit}, Search: ${search || 'none'}`
- **Performance:** Optimized with batched queries

#### POST `/api/campaigns`
- **Purpose:** Create new campaign
- **Features:**
  - Auto-generate first tracking link if landing_url provided
  - Links to course
  - Budget and date validation

#### GET `/api/campaigns/[id]`
- **Purpose:** Get detailed campaign information
- **Features:**
  - Aggregates ALL tracking codes for campaign
  - Real-time clicks/visitors from ClickHouse
  - Auto-calculated spent
- **Console Log:** `📋 Campaign Detail API - Campaign ID: ${id}`

#### PUT `/api/campaigns/[id]`
- **Purpose:** Update campaign details
- **Validation:** Status whitelist validation

#### DELETE `/api/campaigns/[id]`
- **Purpose:** Soft delete (sets status to 'hidden')

#### POST `/api/campaigns/[id]/duplicate`
- **Purpose:** Create copy of existing campaign
- **Naming:** Appends '_copy' to name

#### GET `/api/campaigns/[id]/tracking-links`
- **Purpose:** Get all tracking links for a campaign
- **Features:**
  - Real-time clicks from ClickHouse
  - Auto-calculated spent per link
- **Console Log:** `🔗 Campaign Tracking Links API - Campaign ID: ${campaignId}`

#### POST `/api/campaigns/[id]/tracking-links`
- **Purpose:** Create new tracking link for campaign
- **Features:**
  - Budget allocation validation
  - Auto-update campaign budget if enabled
  - Duplicate detection

---

### 3. Course APIs (2 core + 3 extended = 5 endpoints)

#### GET `/api/courses`
- **Purpose:** Get all courses with campaign and visit statistics
- **Features:**
  - Active campaign count from MySQL
  - Total visits from ClickHouse (unique user_id)
  - Summary statistics
- **Console Log:** `📚 Courses API - Page: ${page}, Limit: ${limit}, Search: ${search || 'none'}`

#### POST `/api/courses`
- **Purpose:** Create new course
- **Required:** name, code
- **Optional:** category, duration, price, status

#### GET `/api/courses/[id]`
- **Purpose:** Get course details

#### PUT `/api/courses/[id]`
- **Purpose:** Update course information

#### DELETE `/api/courses/[id]`
- **Purpose:** Soft delete (sets status to 'hidden')
- **Validation:** Cannot delete if course has active campaigns

---

### 4. UTM Code APIs (5 endpoints)

#### GET `/api/utm-codes`
- **Purpose:** Get all UTM tracking codes
- **Features:**
  - Pagination support
  - Search by name, campaign, or source
  - Real-time clicks from ClickHouse
  - Full URL construction with UTM parameters
- **Console Log:** `🏷️ UTM Codes API - Page: ${page}, Limit: ${limit}, Search: ${search || 'none'}`

#### POST `/api/utm-codes`
- **Purpose:** Create new UTM code
- **Features:**
  - Auto-generates tracking code (12 chars)
  - Links to campaign
  - Validates campaign_id

#### GET `/api/utm-codes/[id]`
- **Purpose:** Get UTM code details

#### PUT `/api/utm-codes/[id]`
- **Purpose:** Update UTM code
- **Features:** Supports status toggle (quick toggle)

#### DELETE `/api/utm-codes/[id]`
- **Purpose:** Hard delete UTM code

---

### 5. Analytics APIs (7 endpoints)

#### GET `/api/analytics/performance`
- **Purpose:** Overall performance dashboard
- **Features:**
  - Visitors, conversions, revenue
  - Channel breakdown
  - Visitor trends (current vs comparison period)
  - Date range filtering
- **Console Log:** `📊 Performance Dashboard API - Date Range: ${startDate} to ${endDate}`

#### GET `/api/analytics/channel-performance`
- **Purpose:** Channel-by-channel performance analysis
- **Features:**
  - Groups campaigns by source
  - Calculates CTR, conversion rate per channel
  - Compares channels side-by-side
- **Console Log:** `📊 Channel Performance Analysis API - Date Range: ${startDate} to ${endDate}`

#### GET `/api/analytics/campaign-analysis`
- **Purpose:** Deep dive into specific campaign
- **Features:**
  - Platform filtering (utm_medium)
  - Daily performance data
  - Visitors, conversions, CPA
- **Console Log:** `📊 Campaign Analysis API - Campaign ID: ${campaignId}, Date Range: ${startDate || 'default'} to ${endDate || 'default'}`
- **Required:** campaign_id

#### GET `/api/analytics/conversion-analysis`
- **Purpose:** Conversion funnel and type analysis
- **Features:**
  - Conversion by type (signup, purchase, trial)
  - Conversion trends over time
  - Source breakdown
  - Funnel stages

#### GET `/api/analytics/environment-analysis`
- **Purpose:** Device, OS, and browser breakdown
- **Features:**
  - Device types (desktop, mobile, tablet)
  - Operating systems
  - Browser statistics
  - Screen resolutions (top 10)
- **Console Log:** `🌍 Environment Analysis API - Date Range: ${startDate || 'default'} to ${endDate || 'default'}`

#### GET `/api/analytics/time-analysis`
- **Purpose:** Time-based visitor patterns
- **Features:**
  - Hourly distribution (0-23 in KST timezone)
  - Day of week distribution (Monday-Sunday)
  - Peak hours and days identification
  - Daily trends
- **Console Log:** `⏰ Time Analysis API - Date Range: ${startDate || 'default'} to ${endDate || 'default'}`
- **Timezone:** All times in Korea Standard Time (UTC+9)

#### GET `/api/analytics/returning-analysis`
- **Purpose:** New vs returning visitor analysis
- **Features:**
  - New vs returning comparison
  - Visit frequency distribution
  - Return interval analysis
  - Daily new vs returning trends
- **Console Log:** `🔄 Returning Analysis API - Date Range: ${startDate || 'default'} to ${endDate || 'default'}`

#### GET `/api/analytics/page-flow-analysis`
- **Purpose:** Page navigation and flow patterns
- **Features:**
  - Landing pages with bounce rate
  - Exit pages with exit rate
  - UTM source breakdown
  - Average session depth
- **Console Log:** `🔗 Page Flow Analysis API - Date Range: ${startDate || 'default'} to ${endDate || 'default'}`

---

### 6. Tracking APIs (4 endpoints)

#### POST `/api/track`
- **Purpose:** Track pageviews from external landing pages (Production)
- **Features:**
  - CORS enabled for allowed origins
  - Auto-links UTM to campaign_id and course_id via MySQL lookup
  - Stores in ClickHouse analytics.visit_logs
  - Captures device info, browser, OS
- **Security:** Origin validation

#### POST `/api/track-internal`
- **Purpose:** Track test events on localhost/CosMos dashboard
- **Features:**
  - Restricted to localhost and internal domains
  - Same data structure as /api/track
  - Used for testing before production deployment
- **Console Log:** `[CosMos Internal] Tracking internal test event`

#### POST `/api/log`
- **Purpose:** Log client-side tracking events
- **Features:**
  - Receives data from cosmos-track.js script
  - Page sequence tracking
  - Landing/exit page detection
  - Time on page tracking

#### POST `/api/tracking/generate`
- **Purpose:** Generate tracking link with UTM parameters
- **Features:**
  - Auto-generates 10-char tracking code
  - Stores in MySQL utm_codes table
  - Returns short URL and full URL with UTM params
- **Console Log:** `🔗 Tracking Generate API - Campaign: ${campaignName}, Source: ${utmSource}, Medium: ${utmMedium}`

#### GET `/api/tracking/debug`
- **Purpose:** Get recent tracking events for debugging
- **Features:**
  - Last 24 hours of events
  - Limit 50 most recent
  - Useful for verifying tracking setup

---

### 7. System APIs (2 endpoints)

#### GET `/api/health`
- **Purpose:** Health check endpoint
- **Returns:**
  - status: "healthy"
  - timestamp
  - uptime (in seconds)

#### GET `/api/performance` (System)
- **Purpose:** System performance metrics
- **Features:**
  - Date range filtering
  - Campaign and course filtering
  - Click tracking, visitor metrics
  - Source performance data
- **Console Log:** `📊 [Docker/Local] Performance API - Date Range: ${startDate} to ${endDate}, Campaign: ${campaignId || 'all'}, Course: ${courseId || 'all'}`

---

## Console Logging for Docker/Local Debugging

All APIs now include console logs with emojis for easy identification in Docker and local terminal:

### Log Format
```javascript
console.log(`[Emoji] [Context] API Name - Key Parameters`);
```

### Examples
```javascript
📋 Campaigns API - Page: 1, Limit: 10
📚 Courses API - Search: python
🏷️ UTM Codes API - Page: 1, Search: naver
📊 Performance Dashboard API - Date Range: 2025-01-01 to 2025-12-31
🔗 Tracking Generate API - Campaign: Spring 2025, Source: naver
```

### Emoji Legend
- 🔐 Authentication
- 📋 Campaigns
- 📚 Courses
- 🏷️ UTM Codes
- 📊 Analytics
- 🔗 Tracking
- 🏥 Health
- ⏰ Time Analysis
- 🌍 Environment
- 🔄 Returning Visitors

---

## Database Architecture

### MySQL (Relational)
- `users` - Authentication and user management
- `campaigns` - Campaign metadata
- `courses` - Course information
- `utm_codes` - Tracking links and UTM parameters
- `password_reset_tokens` - Password reset flow
- `sessions` - Active user sessions

### ClickHouse (Analytics)
- `analytics.visit_logs` - Pageview events, user behavior
- `analytics.tracking_events` - Click tracking data
- High-performance aggregations for real-time analytics

---

## Testing APIs

### 1. Using Swagger UI
Visit http://localhost:3000/api-docs to:
- Browse all endpoints
- Try API calls directly
- View request/response schemas
- Test authentication

### 2. Docker Logs
```bash
# Real-time logs
docker-compose logs -f cosmos-dashboard

# Filter by API type
docker-compose logs -f | grep "📋 Campaigns"
docker-compose logs -f | grep "📊 Analytics"
```

### 3. Local Development
```bash
npm run dev
# Watch logs in terminal
```

---

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Forgot Password | 3 attempts | 1 hour |
| Reset Password | 5 attempts | 1 hour |
| Token Validation | 10 attempts | 1 hour |

---

## Performance Optimizations

1. **Batched Queries:** Campaign analytics fetches all tracking codes in single query
2. **Indexed Fields:** campaign_id, course_id, utm_campaign indexed in ClickHouse
3. **Caching:** Static date ranges cached for 5 minutes
4. **Pagination:** All list endpoints support pagination
5. **Connection Pooling:** MySQL connection pool (10 connections)

---

## Security Features

1. **JWT Authentication:** Secure token-based auth
2. **Rate Limiting:** Prevents brute force attacks
3. **CORS:** Configured for allowed origins only
4. **SQL Injection Protection:** Parameterized queries
5. **Password Hashing:** bcrypt with salt rounds
6. **Soft Deletes:** No data permanently deleted

---

## Common Query Parameters

| Parameter | Type | Used By | Description |
|-----------|------|---------|-------------|
| `page` | integer | List APIs | Page number (default: 1) |
| `limit` | integer | List APIs | Items per page (default: 10) |
| `search` | string | Campaigns, Courses, UTM | Search query |
| `start_date` | date | Analytics | Start date filter |
| `end_date` | date | Analytics | End date filter |
| `campaign_id` | integer | Analytics | Filter by campaign |
| `course_id` | integer | Campaigns, Analytics | Filter by course |
| `status` | string | Campaigns, Courses | Filter by status |
| `source` | string | Campaigns | Filter by UTM source |
| `medium` | string | Campaigns | Filter by UTM medium |

---

## Error Responses

All APIs return consistent error format:

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error description"
}
```

Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## Next Steps

1. **View Interactive Docs:** http://localhost:3000/api-docs
2. **Test APIs:** Use Swagger UI to try endpoints
3. **Monitor Logs:** Watch Docker/terminal for debugging
4. **Review Examples:** Check `/examples` folder for usage

---

**Last Updated:** January 6, 2025  
**Maintained By:** CosMos AI Team  
**Support:** support@cosmosai.com

