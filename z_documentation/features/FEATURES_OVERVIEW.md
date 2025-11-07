# CosMos AI Feature Overview

## Summary
- Unified platform for campaign management, analytics, and tracking
- Dual database architecture (ClickHouse + MySQL) for speed and integrity
- Built with Next.js 14, React 18, and TypeScript 5

## Campaign & Course Management
- Create, edit, pause, and archive marketing campaigns
- Associate campaigns with courses and assign budgets
- Auto-pause on budget thresholds with status tracking
- UTM link generator with per-link budgeting and status controls

## Analytics Dashboards
- Real-time performance dashboard with summary KPIs
- Campaign analysis for CTR, conversions, and spend tracking
- Channel performance to compare sources and mediums
- Conversion analysis with type, value, and attribution breakdowns

## Behavioral Insights
- Environment analysis highlighting device, browser, and OS usage
- Time analysis for hour/day trends (Korea Standard Time baseline)
- Page flow visualization for entry, transition, and exit pages
- Returning analysis to monitor retention and visit frequency

## Tracking & Instrumentation
- External tracking script (`cosmos-track.js`) with domain whitelisting
- Session + visitor cookies, UTM persistence, and referrer parsing
- Conversion event API with customizable metadata payloads
- Internal tracking debug tools for QA and validation

## Security & Access Control
- JWT authentication with role-based permissions (Owner/Admin/Observer/Regular)
- Password reset workflow with rate limiting and email notifications
- Session management, token validation, and audit-friendly logging
- Configurable rate-limits per endpoint and secure credential storage

## Integrations & Tooling
- Nodemailer email service with themed HTML templates
- Swagger-powered API docs at `/api-docs`
- Docker Compose stack bundling ClickHouse and MySQL instances
- Detailed setup, troubleshooting, and architecture docs in `z_documentation/`


