# HTTP Status Migration Guide

This migration adds support for tracking HTTP status codes (primarily for 404 pages) in the visit_logs table.

## Steps to Apply Migration

1. **Run the migration script to add the column:**
   ```bash
   node scripts/add-http-status-column.js
   ```

2. **Verify the column was added:**
   ```sql
   DESCRIBE analytics.visit_logs;
   ```
   You should see `http_status Int32 DEFAULT 200` in the column list.

## What Changed

### Database Schema
- Added `http_status` column to `analytics.visit_logs` table (defaults to 200 for existing records)

### Tracking Script (`public/cosmos-track.js`)
- Added `getHttpStatus()` utility function that detects 404 pages by checking:
  - Page title for "404", "not found", "page not found"
  - URL patterns like "/404" or "error=404"
  - Page body content for 404 indicators
- Includes `http_status` in all pageview and exit events

### API Routes
- `/api/track` - Now accepts and stores `http_status` field
- `/api/track-internal` - Now accepts and stores `http_status` field
- `/api/analytics/session-journeys` - Now includes `http_status` in query results

### Frontend
- Session journeys page now highlights 404 pages with:
  - Red background and border
  - Red sequence number circle
  - "404" badge with alert icon
  - Red text color for URL

## Notes

- Existing records will have `http_status = 200` (default value)
- The tracking script detects 404s client-side by analyzing page content
- 404 detection works even if the server doesn't send proper HTTP status codes
- Future pageviews will automatically include the detected HTTP status

