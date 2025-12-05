export const apiSpec = {
  openapi: "3.0.0",
  info: {
    title: "CosMos AI Analytics & Tracking API",
    version: "2.3.0",
    description: "Comprehensive marketing analytics and tracking API for monitoring campaign performance across multiple channels. Includes real-time tracking, detailed analytics, campaign management, user administration, system settings, and profile management capabilities. Updated with 42+ active endpoints.",
    contact: {
      name: "CosMos AI Support",
      email: "support@cosmosai.com",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server (Docker/Local)",
    },
    {
      url: "http://aptdecor.uz",
      description: "Production server",
    },
  ],
  tags: [
    {
      name: "Authentication",
      description: "User authentication and session management (7 endpoints)",
    },
    {
      name: "Campaigns",
      description: "Campaign management and performance tracking (4 endpoints)",
    },
    {
      name: "Courses",
      description: "Course management and analytics (2 endpoints)",
    },
    {
      name: "UTM Tools",
      description: "UTM code management and generation (5 endpoints)",
    },
    {
      name: "Analytics",
      description: "Advanced analytics and metrics endpoints (10 endpoints)",
    },
    {
      name: "Tracking",
      description: "Event tracking and data collection (4 endpoints)",
    },
    {
      name: "Tracked Websites",
      description: "Tracked websites management and analytics (2 endpoints)",
    },
    {
      name: "System",
      description: "System settings, health checks, and monitoring (4 endpoints)",
    },
    {
      name: "Profile",
      description: "User profile management (3 endpoints)",
    },
    {
      name: "User Management",
      description: "User management and administration (Owner only) (3 endpoints)",
    },
  ],
  paths: {
    // ==================== AUTHENTICATION ====================
    "/api/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "User login",
        description: "Authenticate user and receive JWT token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "admin@cosmosai.com" },
                  password: { type: "string", format: "password", example: "password123" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Login successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    token: { type: "string", example: "eyJhbGc..." },
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "number", example: 1 },
                        email: { type: "string", example: "admin@cosmosai.com" },
                        name: { type: "string", example: "Admin User" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    "/api/auth/signup": {
      post: {
        tags: ["Authentication"],
        summary: "User registration",
        description: "Create a new user account",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["company_name", "email", "password", "contact_number", "user_type"],
                properties: {
                  company_name: { type: "string", example: "CosMos Inc" },
                  email: { type: "string", format: "email", example: "user@example.com" },
                  password: { type: "string", format: "password", example: "password123" },
                  contact_number: { type: "string", example: "+821012345678" },
                  user_type: { type: "string", enum: ["admin", "observer", "regular"], example: "regular" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Account created successfully",
          },
        },
      },
    },

    "/api/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "User logout",
        description: "Logout user and invalidate session",
        responses: {
          200: {
            description: "Logged out successfully",
          },
        },
      },
    },

    "/api/auth/validate": {
      post: {
        tags: ["Authentication"],
        summary: "Validate JWT token",
        description: "Validate a JWT token and return user information",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token"],
                properties: {
                  token: { type: "string", example: "eyJhbGc..." },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Token is valid",
          },
        },
      },
    },

    "/api/auth/forgot-password": {
      post: {
        tags: ["Authentication"],
        summary: "Request password reset",
        description: "Send password reset email to user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", format: "email", example: "user@example.com" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Password reset email sent",
          },
        },
      },
    },

    "/api/auth/reset-password": {
      post: {
        tags: ["Authentication"],
        summary: "Reset password",
        description: "Reset user password with token from email",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token", "password", "confirmPassword"],
                properties: {
                  token: { type: "string", example: "reset-token-123" },
                  password: { type: "string", format: "password" },
                  confirmPassword: { type: "string", format: "password" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Password reset successful",
          },
        },
      },
    },

    "/api/auth/reset-password/validate": {
      post: {
        tags: ["Authentication"],
        summary: "Validate password reset token",
        description: "Check if password reset token is valid",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token"],
                properties: {
                  token: { type: "string", example: "reset-token-123" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Token is valid",
          },
        },
      },
    },

    // ==================== CAMPAIGNS ====================
    "/api/campaigns": {
      get: {
        tags: ["Campaigns"],
        summary: "Get all campaigns",
        description: "Retrieve list of all campaigns with summary statistics, including clicks, visitors, and tracking codes",
        responses: {
          200: {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    summary: {
                      type: "object",
                      properties: {
                        total_campaigns: { type: "number", example: 15 },
                        active_campaigns: { type: "number", example: 8 },
                        total_budget: { type: "number", example: 50000000 },
                        total_spent: { type: "number", example: 25000000 },
                        total_clicks: { type: "number", example: 1234 },
                        total_visitors: { type: "number", example: 567 },
                      },
                    },
                    campaigns: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "number", example: 1 },
                          name: { type: "string", example: "AI Course Spring 2025" },
                          course_name: { type: "string", example: "Python Programming" },
                          source: { type: "string", example: "naver" },
                          medium: { type: "string", example: "cpc" },
                          status: { type: "string", example: "active" },
                          budget: { type: "number", example: 5000000 },
                          spent: { type: "number", example: 2500000 },
                          clicks: { type: "number", example: 120 },
                          visitors: { type: "number", example: 85 },
                          tracking_codes: {
                            type: "array",
                            items: { type: "string" },
                            example: ["NAV001", "KAK002"],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Campaigns"],
        summary: "Create new campaign",
        description: "Create a new marketing campaign",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "course_id", "source", "medium", "start_date", "end_date", "budget"],
                properties: {
                  name: { type: "string", example: "Spring 2025 Campaign" },
                  course_id: { type: "number", example: 1 },
                  source: { type: "string", example: "naver" },
                  medium: { type: "string", example: "cpc" },
                  status: { type: "string", example: "active" },
                  start_date: { type: "string", format: "date" },
                  end_date: { type: "string", format: "date" },
                  budget: { type: "number", example: 5000000 },
                  description: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Campaign created successfully",
          },
        },
      },
    },

    "/api/campaigns/{id}": {
      get: {
        tags: ["Campaigns"],
        summary: "Get campaign details",
        description: "Retrieve detailed information about a specific campaign including aggregated analytics",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          200: {
            description: "Campaign details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    campaign: {
                      type: "object",
                      properties: {
                        id: { type: "number" },
                        name: { type: "string" },
                        clicks: { type: "number" },
                        visitors: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      put: {
        tags: ["Campaigns"],
        summary: "Update campaign",
        description: "Update an existing campaign",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  status: { type: "string" },
                  budget: { type: "number" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Campaign updated successfully",
          },
        },
      },
      delete: {
        tags: ["Campaigns"],
        summary: "Delete campaign",
        description: "Soft delete a campaign (set status to hidden)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description: "Campaign deleted successfully",
          },
        },
      },
    },

    "/api/campaigns/{id}/duplicate": {
      post: {
        tags: ["Campaigns"],
        summary: "Duplicate campaign",
        description: "Create a copy of an existing campaign",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description: "Campaign duplicated successfully",
          },
        },
      },
    },

    "/api/campaigns/{id}/tracking-links": {
      get: {
        tags: ["Campaigns"],
        summary: "Get campaign tracking links",
        description: "Retrieve all tracking links for a specific campaign",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description: "Tracking links retrieved successfully",
          },
        },
      },
      post: {
        tags: ["Campaigns"],
        summary: "Create tracking link for campaign",
        description: "Create a new tracking link for a specific campaign",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "utm_source", "utm_medium", "utm_campaign", "landing_url"],
                properties: {
                  name: { type: "string" },
                  utm_source: { type: "string" },
                  utm_medium: { type: "string" },
                  utm_campaign: { type: "string" },
                  landing_url: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Tracking link created successfully",
          },
        },
      },
    },

    // ==================== COURSES ====================
    "/api/courses": {
      get: {
        tags: ["Courses"],
        summary: "Get all courses",
        description: "Retrieve list of all courses with active campaigns and visit statistics",
        responses: {
          200: {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    summary: {
                      type: "object",
                      properties: {
                        total_courses: { type: "number", example: 25 },
                        active_courses: { type: "number", example: 18 },
                        total_campaigns: { type: "number", example: 45 },
                        total_visits: { type: "number", example: 18500 },
                      },
                    },
                    courses: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "number" },
                          name: { type: "string" },
                          active_campaigns: { type: "number" },
                          total_visits: { type: "number" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Courses"],
        summary: "Create new course",
        description: "Create a new course",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "code"],
                properties: {
                  name: { type: "string", example: "Python Programming" },
                  code: { type: "string", example: "PY101" },
                  category: { type: "string" },
                  duration: { type: "number" },
                  price: { type: "number" },
                  status: { type: "string", example: "active" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Course created successfully",
          },
        },
      },
    },

    "/api/courses/{id}": {
      get: {
        tags: ["Courses"],
        summary: "Get course details",
        description: "Retrieve detailed information about a specific course",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description: "Course details",
          },
        },
      },
      put: {
        tags: ["Courses"],
        summary: "Update course",
        description: "Update an existing course",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  code: { type: "string" },
                  status: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Course updated successfully",
          },
        },
      },
      delete: {
        tags: ["Courses"],
        summary: "Delete course",
        description: "Soft delete a course (set status to hidden)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description: "Course deleted successfully",
          },
        },
      },
    },

    // ==================== UTM TOOLS ====================
    "/api/utm-codes": {
      get: {
        tags: ["UTM Tools"],
        summary: "Get all UTM codes",
        description: "Retrieve list of all UTM codes with click tracking, campaign associations, and full URLs",
        parameters: [
          {
            name: "search",
            in: "query",
            description: "Search by UTM name, campaign name, or source",
            schema: { type: "string", example: "naver" },
          },
        ],
        responses: {
          200: {
            description: "UTM codes retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    summary: {
                      type: "object",
                      properties: {
                        total_utms: { type: "number", example: 5 },
                        active_utms: { type: "number", example: 3 },
                        inactive_utms: { type: "number", example: 1 },
                        total_clicks: { type: "number", example: 4130 },
                      },
                    },
                    utm_list: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "number", example: 1 },
                          name: { type: "string", example: "2501_ai_education_naver_search" },
                          tracking_code: { type: "string", example: "NAV001" },
                          campaign_name: { type: "string", example: "AI Education Campaign" },
                          course_name: { type: "string", example: "AI Course" },
                          utm_source: { type: "string", example: "naver" },
                          utm_medium: { type: "string", example: "cpc" },
                          utm_campaign: { type: "string", example: "ai_2501" },
                          utm_term: { type: "string", example: "ai-course" },
                          utm_content: { type: "string", example: "banner1" },
                          landing_url: { type: "string", example: "https://aptdecor.uz/course" },
                          full_url: { type: "string", example: "https://aptdecor.uz/course?utm_campaign=ai_2501&utm_source=naver&utm_medium=cpc" },
                          created_at: { type: "string", format: "date-time", example: "2025-01-05T10:00:00Z" },
                          clicks: { type: "number", example: 1240 },
                          status: { type: "string", enum: ["active", "inactive", "ended"], example: "active" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["UTM Tools"],
        summary: "Create new UTM code",
        description: "Create a new UTM tracking code",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "landing_url", "campaign_id"],
                properties: {
                  name: { type: "string", example: "Naver CPC Link" },
                  landing_url: { type: "string", example: "https://example.com" },
                  campaign_id: { type: "number", example: 1 },
                  utm_source: { type: "string" },
                  utm_medium: { type: "string" },
                  utm_term: { type: "string" },
                  utm_content: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "UTM code created successfully",
          },
        },
      },
    },

    "/api/utm-codes/{id}": {
      get: {
        tags: ["UTM Tools"],
        summary: "Get UTM code details",
        description: "Retrieve detailed information about a specific UTM code",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description: "UTM code details",
          },
        },
      },
      put: {
        tags: ["UTM Tools"],
        summary: "Update UTM code",
        description: "Update an existing UTM code",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  status: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "UTM code updated successfully",
          },
        },
      },
      delete: {
        tags: ["UTM Tools"],
        summary: "Delete UTM code",
        description: "Delete a UTM tracking code",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description: "UTM code deleted successfully",
          },
        },
      },
    },

    // ==================== ANALYTICS ====================
    "/api/analytics/performance": {
      get: {
        tags: ["Analytics"],
        summary: "Performance Dashboard",
        description: "Get overall performance metrics including visitors, conversions, and channel breakdown",
        parameters: [
          {
            name: "start_date",
            in: "query",
            schema: { type: "string", format: "date", example: "2025-01-01" },
          },
          {
            name: "end_date",
            in: "query",
            schema: { type: "string", format: "date", example: "2025-12-31" },
          },
        ],
        responses: {
          200: {
            description: "Performance metrics",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    metrics: {
                      type: "object",
                      properties: {
                        totalVisitors: { type: "number" },
                        conversions: { type: "number" },
                        conversionRate: { type: "string" },
                        revenue: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    "/api/analytics/channel-performance": {
      get: {
        tags: ["Analytics"],
        summary: "Channel Performance Analysis",
        description: "Analyze performance by marketing channel with campaign breakdown",
        parameters: [
          {
            name: "start",
            in: "query",
            schema: { type: "string", format: "date" },
          },
          {
            name: "end",
            in: "query",
            schema: { type: "string", format: "date" },
          },
        ],
        responses: {
          200: {
            description: "Channel performance data with campaigns",
          },
        },
      },
    },

    "/api/analytics/conversion-analysis": {
      get: {
        tags: ["Analytics"],
        summary: "Conversion Analysis",
        description: "Analyze conversions by type, source, and time",
        parameters: [
          {
            name: "startDate",
            in: "query",
            schema: { type: "string", format: "date" },
          },
          {
            name: "endDate",
            in: "query",
            schema: { type: "string", format: "date" },
          },
          {
            name: "campaignId",
            in: "query",
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Conversion analysis data",
          },
        },
      },
    },

    "/api/analytics/campaign-analysis": {
      get: {
        tags: ["Analytics"],
        summary: "Campaign Performance Analysis",
        description: "Detailed campaign-specific metrics and daily performance data",
        parameters: [
          {
            name: "campaign_id",
            in: "query",
            required: true,
            schema: { type: "integer" },
          },
          {
            name: "platform",
            in: "query",
            schema: { type: "string", example: "naver" },
          },
          {
            name: "start_date",
            in: "query",
            schema: { type: "string", format: "date" },
          },
          {
            name: "end_date",
            in: "query",
            schema: { type: "string", format: "date" },
          },
        ],
        responses: {
          200: {
            description: "Campaign performance data",
          },
        },
      },
    },

    "/api/analytics/environment-analysis": {
      get: {
        tags: ["Analytics"],
        summary: "Environment Analysis",
        description: "User device, OS, and browser breakdown statistics",
        parameters: [
          {
            name: "start_date",
            in: "query",
            schema: { type: "string", format: "date" },
          },
          {
            name: "end_date",
            in: "query",
            schema: { type: "string", format: "date" },
          },
        ],
        responses: {
          200: {
            description: "Environment statistics",
          },
        },
      },
    },

    "/api/analytics/time-analysis": {
      get: {
        tags: ["Analytics"],
        summary: "Time-based Analysis (KST)",
        description: "Hourly and day-of-week visitor patterns in Korea Standard Time (UTC+9)",
        parameters: [
          {
            name: "start_date",
            in: "query",
            schema: { type: "string", format: "date" },
          },
          {
            name: "end_date",
            in: "query",
            schema: { type: "string", format: "date" },
          },
        ],
        responses: {
          200: {
            description: "Time-based analytics (KST timezone)",
          },
        },
      },
    },

    "/api/analytics/returning-analysis": {
      get: {
        tags: ["Analytics"],
        summary: "Returning Visitor Analysis",
        description: "New vs returning visitor comparison and visit frequency patterns",
        parameters: [
          {
            name: "start_date",
            in: "query",
            schema: { type: "string", format: "date" },
          },
          {
            name: "end_date",
            in: "query",
            schema: { type: "string", format: "date" },
          },
        ],
        responses: {
          200: {
            description: "Returning visitor analytics",
          },
        },
      },
    },

    "/api/analytics/page-flow-analysis": {
      get: {
        tags: ["Analytics"],
        summary: "Page Flow Analysis",
        description: "Landing pages, exit pages, and navigation patterns",
        parameters: [
          {
            name: "start_date",
            in: "query",
            schema: { type: "string", format: "date" },
          },
          {
            name: "end_date",
            in: "query",
            schema: { type: "string", format: "date" },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20 },
            description: "Number of results to return (20 or 50)",
          },
          {
            name: "domain",
            in: "query",
            schema: { type: "string" },
            description: "Filter by domain name",
          },
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Search by domain or page URL",
          },
        ],
        responses: {
          200: {
            description: "Page flow analytics",
          },
        },
      },
    },

    "/api/analytics/session-journeys": {
      get: {
        tags: ["Analytics"],
        summary: "Session Journeys",
        description: "Complete page-by-page user journey visualization with session timeline, landing pages, exit pages, and device information",
        parameters: [
          {
            name: "start_date",
            in: "query",
            schema: { type: "string", format: "date" },
            description: "Start date for session filtering",
          },
          {
            name: "end_date",
            in: "query",
            schema: { type: "string", format: "date" },
            description: "End date for session filtering",
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 50 },
            description: "Maximum number of sessions to return (default: 50)",
          },
        ],
        responses: {
          200: {
            description: "Session journeys with complete page sequences",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    sessions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          session_id: { type: "string", example: "uuid-session-123" },
                          user_id: { type: "string", example: "uuid-user-456" },
                          session_start: { type: "string", format: "date-time" },
                          session_end: { type: "string", format: "date-time" },
                          total_pages: { type: "number", example: 5 },
                          duration: { type: "number", example: 180 },
                          landing_page: { type: "string" },
                          exit_page: { type: "string" },
                          utm_source: { type: "string" },
                          utm_medium: { type: "string" },
                          utm_campaign: { type: "string" },
                          device_type: { type: "string", example: "desktop" },
                          browser: { type: "string", example: "Chrome" },
                          os: { type: "string", example: "Windows" },
                          pages: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                page_url: { type: "string" },
                                page_title: { type: "string" },
                                page_sequence: { type: "number" },
                                timestamp: { type: "string", format: "date-time" },
                                time_on_page: { type: "number" },
                                event_type: { type: "string" },
                                is_landing_page: { type: "number" },
                                is_exit_page: { type: "number" },
                              },
                            },
                          },
                          has_exit_event: { type: "boolean" },
                          exit_page_url: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    "/api/analytics/tracked-websites": {
      get: {
        tags: ["Analytics"],
        summary: "Tracked Websites Analysis",
        description: "Domain-level tracking statistics including sessions, visitors, pageviews, conversions, and activity status",
        parameters: [
          {
            name: "start",
            in: "query",
            schema: { type: "string", format: "date" },
            description: "Start date (default: 90 days ago)",
          },
          {
            name: "end",
            in: "query",
            schema: { type: "string", format: "date" },
            description: "End date (default: today)",
          },
        ],
        responses: {
          200: {
            description: "Tracked websites statistics",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    websites: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          domain: { type: "string", example: "example.com" },
                          total_sessions: { type: "number", example: 1250 },
                          unique_visitors: { type: "number", example: 890 },
                          total_pageviews: { type: "number", example: 3420 },
                          total_conversions: { type: "number", example: 45 },
                          first_seen: { type: "string", format: "date-time" },
                          last_seen: { type: "string", format: "date-time" },
                          is_active: { type: "boolean", example: true },
                          is_enabled: { type: "boolean", example: true },
                          status: { type: "string", enum: ["Active", "Inactive", "Disabled"] },
                        },
                      },
                    },
                    summary: {
                      type: "object",
                      properties: {
                        total_websites: { type: "number", example: 15 },
                        active_websites: { type: "number", example: 12 },
                        inactive_websites: { type: "number", example: 2 },
                        disabled_websites: { type: "number", example: 1 },
                        total_sessions: { type: "number", example: 18500 },
                        total_visitors: { type: "number", example: 12500 },
                        total_pageviews: { type: "number", example: 45200 },
                        total_conversions: { type: "number", example: 320 },
                      },
                    },
                    dateRange: {
                      type: "object",
                      properties: {
                        start: { type: "string", format: "date" },
                        end: { type: "string", format: "date" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    "/api/analytics/debug-sessions": {
      get: {
        tags: ["Analytics"],
        summary: "Debug Sessions",
        description: "Session journeys filtered by specific debug domains for testing and validation purposes",
        parameters: [
          {
            name: "start_date",
            in: "query",
            schema: { type: "string", format: "date" },
            description: "Start date for session filtering",
          },
          {
            name: "end_date",
            in: "query",
            schema: { type: "string", format: "date" },
            description: "End date for session filtering",
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 50 },
            description: "Maximum number of sessions to return (default: 50)",
          },
        ],
        responses: {
          200: {
            description: "Debug session journeys for specific domains",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    sessions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          session_id: { type: "string" },
                          user_id: { type: "string" },
                          session_start: { type: "string", format: "date-time" },
                          session_end: { type: "string", format: "date-time" },
                          total_pages: { type: "number" },
                          duration: { type: "number" },
                          landing_page: { type: "string" },
                          exit_page: { type: "string" },
                          utm_source: { type: "string" },
                          utm_medium: { type: "string" },
                          utm_campaign: { type: "string" },
                          device_type: { type: "string" },
                          browser: { type: "string" },
                          os: { type: "string" },
                          tracked_domain: { type: "string", example: "aptdecor.uz" },
                          pages: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                page_url: { type: "string" },
                                page_title: { type: "string" },
                                page_sequence: { type: "number" },
                                timestamp: { type: "string", format: "date-time" },
                                time_on_page: { type: "number" },
                                event_type: { type: "string" },
                                is_landing_page: { type: "number" },
                                is_exit_page: { type: "number" },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ==================== TRACKING ====================
    "/api/track": {
      post: {
        tags: ["Tracking"],
        summary: "Track external pageview (Production)",
        description: "Receives pageview events from external landing pages with UTM campaign linking to MySQL",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["user_id", "session_id", "page_url"],
                properties: {
                  user_id: { type: "string", example: "uuid-visitor-123" },
                  session_id: { type: "string", example: "uuid-session-456" },
                  page_url: { type: "string", example: "https://example.com/page" },
                  referrer: { type: "string" },
                  utm_source: { type: "string" },
                  utm_medium: { type: "string" },
                  utm_campaign: { type: "string" },
                  event_type: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Event logged successfully",
          },
        },
      },
    },

    "/api/track-internal": {
      post: {
        tags: ["Tracking"],
        summary: "Track internal test events (Localhost only)",
        description: "Internal tracking endpoint for testing on localhost/CosMos dashboard only",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["user_id", "session_id", "page_url"],
                properties: {
                  user_id: { type: "string" },
                  session_id: { type: "string" },
                  page_url: { type: "string" },
                  event_type: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Internal test tracking recorded",
          },
        },
      },
    },

    "/api/log": {
      post: {
        tags: ["Tracking"],
        summary: "Log client-side tracking event",
        description: "Receives pageview events from cosmos-track.js client-side script with UTM parameters, device info, and page flow data",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["user_id", "session_id", "page_url", "event_type"],
                properties: {
                  user_id: { type: "string", example: "uuid-visitor-123" },
                  session_id: { type: "string", example: "uuid-session-456" },
                  page_url: { type: "string", example: "https://example.com/page" },
                  referrer: { type: "string" },
                  utm_source: { type: "string", example: "google" },
                  utm_medium: { type: "string", example: "cpc" },
                  utm_campaign: { type: "string", example: "spring_sale" },
                  event_type: { type: "string", example: "pageview" },
                  device_type: { type: "string", example: "desktop" },
                  browser: { type: "string", example: "Chrome" },
                  os: { type: "string", example: "Windows" },
                  screen_resolution: { type: "string", example: "1920x1080" },
                  visit_count: { type: "number", example: 3 },
                  page_sequence: { type: "number", example: 2 },
                  is_landing_page: { type: "number", example: 0 },
                  previous_page_url: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Event logged successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
        },
      },
    },

    "/api/tracking/generate": {
      post: {
        tags: ["Tracking"],
        summary: "Generate tracking link",
        description: "Generate a new tracking link with UTM parameters for a campaign",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["campaignName", "targetUrl", "utmSource", "utmMedium", "utmCampaign"],
                properties: {
                  name: { type: "string", example: "Naver CPC Link" },
                  campaignName: { type: "string", example: "Spring 2025" },
                  campaignId: { type: "number", example: 1 },
                  targetUrl: { type: "string", example: "https://example.com" },
                  utmSource: { type: "string", example: "naver" },
                  utmMedium: { type: "string", example: "cpc" },
                  utmCampaign: { type: "string", example: "spring_2025" },
                  utmContent: { type: "string" },
                  utmTerm: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Tracking link generated successfully",
          },
        },
      },
    },

    "/api/tracking/debug": {
      get: {
        tags: ["Tracking"],
        summary: "Get recent tracking events",
        description: "Retrieve recent tracking events for debugging purposes (last 24 hours)",
        responses: {
          200: {
            description: "Recent tracking events",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    events: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          timestamp: { type: "string" },
                          user_id: { type: "string" },
                          page_url: { type: "string" },
                          event_type: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    "/t/{code}": {
      get: {
        tags: ["Tracking"],
        summary: "Track click and redirect (Production)",
        description: "Records click event with server-side visit logging and redirects to target URL. Uses path parameter for tracking code.",
        parameters: [
          {
            name: "code",
            in: "path",
            required: true,
            description: "Tracking code (e.g., NAV001)",
            schema: { type: "string", example: "NAV001" },
          },
        ],
        responses: {
          302: {
            description: "Redirect to target URL",
          },
          404: {
            description: "Invalid or expired tracking code",
          },
        },
      },
    },


    // ==================== SYSTEM ====================
    "/api/health": {
      get: {
        tags: ["System"],
        summary: "Health check",
        description: "Check API health status and uptime",
        responses: {
          200: {
            description: "System is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "healthy" },
                    timestamp: { type: "string", format: "date-time" },
                    uptime: { type: "number", example: 3600 },
                  },
                },
              },
            },
          },
        },
      },
    },

    "/api/performance": {
      get: {
        tags: ["System"],
        summary: "System performance metrics",
        description: "Get system performance and resource utilization metrics",
        responses: {
          200: {
            description: "Performance metrics retrieved",
          },
        },
      },
    },

    "/api/system/settings": {
      get: {
        tags: ["System"],
        summary: "Get all system settings",
        description: "Retrieve all system settings (Owner only). Requires system:read permission.",
        security: [
          {
            bearerAuth: [],
          },
        ],
        responses: {
          200: {
            description: "System settings retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    settings: {
                      type: "object",
                      properties: {
                        default_date_range: { type: "number", example: 7 },
                        default_timezone: { type: "string", example: "Asia/Seoul" },
                        default_campaign_status: { type: "string", enum: ["active", "waiting", "paused", "ended"], example: "waiting" },
                        default_user_role: { type: "string", enum: ["admin", "observer", "regular"], example: "regular" },
                        session_timeout_minutes: { type: "number", example: 120 },
                        allow_new_signups: { type: "boolean", example: true },
                        allow_tracking: { type: "boolean", example: true },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: "Unauthorized - Missing or invalid token",
          },
          403: {
            description: "Forbidden - Owner privileges required (system:read permission)",
          },
        },
      },
      put: {
        tags: ["System"],
        summary: "Update system settings",
        description: "Update system settings (Owner only). Requires system:update permission.",
        security: [
          {
            bearerAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["settings"],
                properties: {
                  settings: {
                    type: "object",
                    properties: {
                      default_date_range: { type: "number", example: 7 },
                      default_timezone: { type: "string", example: "Asia/Seoul" },
                      default_campaign_status: { type: "string", enum: ["active", "waiting", "paused", "ended"] },
                      default_user_role: { type: "string", enum: ["admin", "observer", "regular"] },
                      session_timeout_minutes: { type: "number", example: 120 },
                      allow_new_signups: { type: "boolean", example: true },
                      allow_tracking: { type: "boolean", example: true },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Settings updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Settings updated successfully" },
                  },
                },
              },
            },
          },
          400: {
            description: "Invalid settings data or invalid setting keys",
          },
          401: {
            description: "Unauthorized - Missing or invalid token",
          },
          403: {
            description: "Forbidden - Owner privileges required (system:update permission)",
          },
        },
      },
    },

    "/api/system/settings/defaults": {
      get: {
        tags: ["System"],
        summary: "Get public system defaults",
        description: "Get non-sensitive system defaults (date range, timezone, etc.) for authenticated users. Full settings require system:read permission.",
        security: [
          {
            bearerAuth: [],
          },
        ],
        responses: {
          200: {
            description: "Public defaults retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    settings: {
                      type: "object",
                      properties: {
                        default_date_range: { type: "number", example: 7 },
                        default_timezone: { type: "string", example: "Asia/Seoul" },
                        default_campaign_status: { type: "string", example: "waiting" },
                        default_user_role: { type: "string", example: "regular" },
                        allow_tracking: { type: "boolean", example: true },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: "Unauthorized - Missing or invalid token",
          },
        },
      },
    },

    "/api/system/settings/session-timeout": {
      get: {
        tags: ["System"],
        summary: "Get session timeout",
        description: "Get session timeout in minutes for tracking script. Public endpoint (no auth required) used by cosmos-track.js.",
        responses: {
          200: {
            description: "Session timeout retrieved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    timeout_minutes: { type: "number", example: 120 },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ==================== USER MANAGEMENT ====================
    "/api/users": {
      get: {
        tags: ["User Management"],
        summary: "Get all users",
        description: "Retrieve list of all users (Owner only). Returns users with their types, statuses, and account information.",
        security: [
          {
            bearerAuth: [],
          },
        ],
        responses: {
          200: {
            description: "Users retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    users: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "number", example: 1 },
                          uuid: { type: "string", example: "uuid-user-123" },
                          email: { type: "string", example: "user@example.com" },
                          company_name: { type: "string", example: "Example Corp" },
                          contact_number: { type: "string", example: "+821012345678" },
                          user_type: { type: "string", enum: ["admin", "observer", "regular"], example: "regular" },
                          status: { type: "string", enum: ["pending", "active", "stopped", "blocked"], example: "active" },
                          created_at: { type: "string", format: "date-time" },
                          last_login_at: { type: "string", format: "date-time", nullable: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: "Unauthorized - Missing or invalid token",
          },
          403: {
            description: "Forbidden - Owner privileges required",
          },
        },
      },
    },

    "/api/users/{id}": {
      patch: {
        tags: ["User Management"],
        summary: "Update user",
        description: "Update user type or status (Owner only). Cannot modify owner accounts.",
        security: [
          {
            bearerAuth: [],
          },
        ],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  user_type: { type: "string", enum: ["admin", "observer", "regular"], example: "admin" },
                  status: { type: "string", enum: ["pending", "active", "stopped", "blocked"], example: "active" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "User updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "User updated successfully" },
                  },
                },
              },
            },
          },
          400: {
            description: "Invalid user type or status",
          },
          401: {
            description: "Unauthorized - Missing or invalid token",
          },
          403: {
            description: "Forbidden - Owner privileges required or cannot modify owner accounts",
          },
          404: {
            description: "User not found",
          },
        },
      },
      delete: {
        tags: ["User Management"],
        summary: "Delete user",
        description: "Soft delete a user by setting status to hidden (Owner only). Cannot delete owner accounts.",
        security: [
          {
            bearerAuth: [],
          },
        ],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          200: {
            description: "User deleted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "User deleted successfully" },
                  },
                },
              },
            },
          },
          401: {
            description: "Unauthorized - Missing or invalid token",
          },
          403: {
            description: "Forbidden - Owner privileges required or cannot delete owner accounts",
          },
          404: {
            description: "User not found",
          },
        },
      },
    },

    // ==================== PROFILE ====================
    "/api/profile": {
      get: {
        tags: ["Profile"],
        summary: "Get current user's profile",
        description: "Retrieve current authenticated user's profile information",
        security: [
          {
            bearerAuth: [],
          },
        ],
        responses: {
          200: {
            description: "Profile retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "number", example: 1 },
                        uuid: { type: "string", example: "uuid-user-123" },
                        email: { type: "string", example: "user@example.com" },
                        company_name: { type: "string", example: "Example Corp" },
                        contact_number: { type: "string", example: "+821012345678" },
                        user_type: { type: "string", enum: ["owner", "admin", "observer", "regular"], example: "regular" },
                        status: { type: "string", enum: ["active", "pending", "stopped", "blocked"], example: "active" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: "Unauthorized - Missing or invalid token",
          },
          404: {
            description: "User not found",
          },
        },
      },
      patch: {
        tags: ["Profile"],
        summary: "Update current user's profile",
        description: "Update profile information or change password. Requires current password verification for password changes.",
        security: [
          {
            bearerAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["currentPassword"],
                properties: {
                  email: { type: "string", format: "email", example: "newemail@example.com" },
                  contact_number: { type: "string", example: "+821012345678" },
                  company_name: { type: "string", example: "New Company Name" },
                  currentPassword: { type: "string", format: "password", example: "currentPassword123" },
                  newPassword: { type: "string", format: "password", example: "newPassword123" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Profile updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Profile updated successfully" },
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "number" },
                        uuid: { type: "string" },
                        email: { type: "string" },
                        company_name: { type: "string" },
                        contact_number: { type: "string" },
                        user_type: { type: "string" },
                        status: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: "Invalid input, duplicate email/phone, or incorrect password",
          },
          401: {
            description: "Unauthorized - Missing or invalid token",
          },
          404: {
            description: "User not found",
          },
        },
      },
      delete: {
        tags: ["Profile"],
        summary: "Delete current user's account",
        description: "Soft delete current user's account. Requires current password verification.",
        security: [
          {
            bearerAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["currentPassword"],
                properties: {
                  currentPassword: { type: "string", format: "password", example: "currentPassword123" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Account deleted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Account deleted successfully" },
                  },
                },
              },
            },
          },
          400: {
            description: "Current password is required or incorrect",
          },
          401: {
            description: "Unauthorized - Missing or invalid token",
          },
          404: {
            description: "User not found",
          },
        },
      },
    },

    // ==================== TRACKED WEBSITES ====================
    "/api/tracked-websites/toggle": {
      patch: {
        tags: ["Tracked Websites"],
        summary: "Toggle website tracking status",
        description: "Enable or disable tracking for a specific domain",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["domain", "is_enabled"],
                properties: {
                  domain: { type: "string", example: "example.com" },
                  is_enabled: { type: "boolean", example: true },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Website status updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Domain enabled successfully" },
                    domain: { type: "string", example: "example.com" },
                    is_enabled: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          400: {
            description: "Invalid parameters",
          },
          404: {
            description: "Domain not found",
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT token obtained from /api/auth/login endpoint",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: { type: "string" },
          message: { type: "string" },
        },
      },
    },
  },
};
