export const apiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Admin Panel Analytics API",
    version: "1.0.0",
    description: "UTM tracking and analytics API for monitoring campaign performance across different channels (Telegram, Kakao, Naver, Google, etc.)",
    contact: {
      name: "API Support",
      email: "support@example.com",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
    {
      url: "https://your-domain.com",
      description: "Production server",
    },
  ],
  tags: [
    {
      name: "Analytics",
      description: "Analytics and metrics endpoints",
    },
    {
      name: "Tracking",
      description: "Tracking link generation and click tracking",
    },
  ],
  paths: {
    "/api/analytics": {
      get: {
        tags: ["Analytics"],
        summary: "Get analytics data",
        description: "Retrieve comprehensive analytics data including stats, clicks, platforms, devices, and campaigns for a specified time period.",
        parameters: [
          {
            name: "days",
            in: "query",
            description: "Number of days to retrieve data for",
            required: false,
            schema: {
              type: "integer",
              default: 7,
              minimum: 1,
              maximum: 365,
            },
          },
        ],
        responses: {
          200: {
            description: "Successful response with analytics data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    data: {
                      type: "object",
                      properties: {
                        stats: {
                          type: "object",
                          properties: {
                            total_clicks: {
                              type: "number",
                              example: 1234,
                            },
                            unique_visitors: {
                              type: "number",
                              example: 567,
                            },
                            active_campaigns: {
                              type: "number",
                              example: 8,
                            },
                          },
                        },
                        clicks: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              date: {
                                type: "string",
                                format: "date",
                                example: "2024-01-15",
                              },
                              clicks: {
                                type: "number",
                                example: 120,
                              },
                              conversions: {
                                type: "number",
                                example: 45,
                              },
                            },
                          },
                        },
                        platforms: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: {
                                type: "string",
                                example: "telegram",
                              },
                              value: {
                                type: "number",
                                example: 450,
                              },
                              color: {
                                type: "string",
                                example: "#0088cc",
                              },
                            },
                          },
                        },
                        devices: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              device: {
                                type: "string",
                                example: "Mobile",
                              },
                              visits: {
                                type: "number",
                                example: 800,
                              },
                            },
                          },
                        },
                        campaigns: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: {
                                type: "string",
                                example: "Summer Sale 2024",
                              },
                              clicks: {
                                type: "number",
                                example: 234,
                              },
                              ctr: {
                                type: "string",
                                example: "18.9%",
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
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: false,
                    },
                    error: {
                      type: "string",
                      example: "Failed to fetch analytics data",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/tracking/links/{id}": {
      delete: {
        tags: ["Tracking"],
        summary: "Delete tracking link",
        description: "Mark a tracking link as inactive (soft delete). The link will no longer appear in lists but data is preserved for analytics.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Unique identifier of the tracking link",
            schema: {
              type: "string",
              example: "abc123xyz",
            },
          },
        ],
        responses: {
          200: {
            description: "Link deleted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    message: {
                      type: "string",
                      example: "Link deleted successfully",
                    },
                  },
                },
              },
            },
          },
          400: {
            description: "Bad request - Missing link ID",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: false,
                    },
                    error: {
                      type: "string",
                      example: "Link ID is required",
                    },
                  },
                },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: false,
                    },
                    error: {
                      type: "string",
                      example: "Failed to delete tracking link",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/tracking/links": {
      get: {
        tags: ["Tracking"],
        summary: "Get stored tracking links",
        description: "Retrieve previously generated tracking links from the database.",
        parameters: [
          {
            name: "limit",
            in: "query",
            description: "Maximum number of links to return",
            required: false,
            schema: {
              type: "integer",
              default: 50,
              minimum: 1,
              maximum: 100,
            },
          },
        ],
        responses: {
          200: {
            description: "Successfully retrieved tracking links",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    links: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: {
                            type: "string",
                            example: "abc123xyz",
                          },
                          campaignName: {
                            type: "string",
                            example: "Summer Sale 2024",
                          },
                          trackingCode: {
                            type: "string",
                            example: "xyz789abc",
                          },
                          targetUrl: {
                            type: "string",
                            example: "https://yourwebsite.com/landing",
                          },
                          utmSource: {
                            type: "string",
                            example: "telegram",
                          },
                          utmMedium: {
                            type: "string",
                            example: "social",
                          },
                          utmCampaign: {
                            type: "string",
                            example: "summer_sale",
                          },
                          fullUrl: {
                            type: "string",
                            example: "http://localhost:3000/track?code=xyz789abc&...",
                          },
                          createdAt: {
                            type: "string",
                            format: "date-time",
                            example: "2024-01-15T10:30:00.000Z",
                          },
                        },
                      },
                    },
                    count: {
                      type: "number",
                      example: 10,
                    },
                  },
                },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: false,
                    },
                    error: {
                      type: "string",
                      example: "Failed to fetch tracking links",
                    },
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
        description: "Generate a unique tracking URL with UTM parameters for campaign tracking.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["campaignName", "targetUrl", "utmSource", "utmMedium", "utmCampaign"],
                properties: {
                  campaignName: {
                    type: "string",
                    description: "Name of the campaign",
                    example: "Summer Sale 2024",
                  },
                  targetUrl: {
                    type: "string",
                    format: "uri",
                    description: "The destination URL where users will be redirected",
                    example: "https://yourwebsite.com/landing",
                  },
                  utmSource: {
                    type: "string",
                    description: "Traffic source (e.g., telegram, kakao, naver, google)",
                    example: "telegram",
                  },
                  utmMedium: {
                    type: "string",
                    description: "Marketing medium (e.g., social, email, cpc)",
                    example: "social",
                  },
                  utmCampaign: {
                    type: "string",
                    description: "Campaign identifier",
                    example: "summer_sale",
                  },
                  utmContent: {
                    type: "string",
                    description: "Content identifier (optional)",
                    example: "banner_ad",
                  },
                  utmTerm: {
                    type: "string",
                    description: "Keywords for paid search (optional)",
                    example: "running shoes",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Tracking link generated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    trackingLink: {
                      type: "object",
                      properties: {
                        id: {
                          type: "string",
                          example: "abc123xyz",
                        },
                        campaignName: {
                          type: "string",
                          example: "Summer Sale 2024",
                        },
                        trackingCode: {
                          type: "string",
                          example: "xyz789abc",
                        },
                        targetUrl: {
                          type: "string",
                          example: "https://yourwebsite.com/landing",
                        },
                        utmSource: {
                          type: "string",
                          example: "telegram",
                        },
                        utmMedium: {
                          type: "string",
                          example: "social",
                        },
                        utmCampaign: {
                          type: "string",
                          example: "summer_sale",
                        },
                        fullUrl: {
                          type: "string",
                          example: "http://localhost:3000/track?code=xyz789abc&utm_source=telegram&utm_medium=social&utm_campaign=summer_sale&r=aHR0cHM6Ly95b3Vyd2Vic2l0ZS5jb20vbGFuZGluZw==",
                        },
                        createdAt: {
                          type: "string",
                          format: "date-time",
                          example: "2024-01-15T10:30:00.000Z",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: "Bad request - Missing required fields",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: false,
                    },
                    error: {
                      type: "string",
                      example: "Missing required fields",
                    },
                  },
                },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: false,
                    },
                    error: {
                      type: "string",
                      example: "Failed to generate tracking link",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/track": {
      get: {
        tags: ["Tracking"],
        summary: "Track click event and redirect",
        description: "Records a click event with device, browser, and location data, then redirects the user to the target URL with UTM parameters appended.",
        parameters: [
          {
            name: "code",
            in: "query",
            required: true,
            description: "Tracking code generated by the system",
            schema: {
              type: "string",
              example: "xyz789abc",
            },
          },
          {
            name: "r",
            in: "query",
            required: false,
            description: "Base64 encoded redirect URL (for messaging apps)",
            schema: {
              type: "string",
              example: "aHR0cHM6Ly95b3Vyd2Vic2l0ZS5jb20vbGFuZGluZw==",
            },
          },
          {
            name: "redirect",
            in: "query",
            required: false,
            description: "URL-encoded redirect URL (for HTML links/ads)",
            schema: {
              type: "string",
              example: "https://yourwebsite.com/landing",
            },
          },
          {
            name: "utm_source",
            in: "query",
            schema: {
              type: "string",
              example: "telegram",
            },
          },
          {
            name: "utm_medium",
            in: "query",
            schema: {
              type: "string",
              example: "social",
            },
          },
          {
            name: "utm_campaign",
            in: "query",
            schema: {
              type: "string",
              example: "summer_sale",
            },
          },
          {
            name: "utm_content",
            in: "query",
            schema: {
              type: "string",
            },
          },
          {
            name: "utm_term",
            in: "query",
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          302: {
            description: "Redirect to target URL with UTM parameters",
          },
          400: {
            description: "Bad request - Missing required parameters",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: {
                      type: "string",
                      example: "Missing parameters",
                    },
                  },
                },
              },
            },
          },
          500: {
            description: "Tracking failed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: {
                      type: "string",
                      example: "Tracking failed",
                    },
                    message: {
                      type: "string",
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
          success: {
            type: "boolean",
            example: false,
          },
          error: {
            type: "string",
          },
          message: {
            type: "string",
          },
        },
      },
    },
  },
};


