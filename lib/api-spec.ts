export const apiSpec = {
  openapi: "3.0.0",
  info: {
    title: "CosMos AI Analytics & Tracking API",
    version: "1.0.0",
    description: "Comprehensive marketing analytics and tracking API for monitoring campaign performance across multiple channels. Includes real-time tracking, detailed analytics, and campaign management capabilities.",
    contact: {
      name: "CosMos AI Support",
      email: "support@cosmosai.com",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
    {
      url: "http://aptdecor.uz",
      description: "Production server",
    },
  ],
  tags: [
    {
      name: "Authentication",
      description: "User authentication and session management",
    },
    {
      name: "Campaigns",
      description: "Campaign management and performance tracking",
    },
    {
      name: "Courses",
      description: "Course management and analytics",
    },
    {
      name: "UTM Tools",
      description: "UTM code management and generation",
    },
    {
      name: "Analytics",
      description: "Advanced analytics and metrics endpoints",
    },
    {
      name: "Tracking",
      description: "Event tracking and data collection",
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

    "/api/analytics/source-analysis": {
      get: {
        tags: ["Analytics"],
        summary: "Source & Media Analysis",
        description: "Analyze traffic sources and media platforms with conversion metrics",
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
            description: "Source analysis data",
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
        ],
        responses: {
          200: {
            description: "Page flow analytics",
          },
        },
      },
    },

    // ==================== TRACKING ====================
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
  },
  components: {
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
