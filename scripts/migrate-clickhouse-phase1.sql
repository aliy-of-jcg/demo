-- ============================================
-- Phase 1 ClickHouse Migration Script
-- Partitioning + Projections
-- ============================================
-- 
-- This script:
-- 1. Adds partitioning to visit_logs table
-- 2. Adds projections for common query patterns
--
-- IMPORTANT: Run this on both local and production
-- ============================================

-- ============================================
-- STEP 0: Generate CREATE TABLE statement
-- ============================================
-- IMPORTANT: Before running Step 1, you need to get the correct schema!
--
-- Option A (Recommended): Run the helper script first:
--   clickhouse-client < scripts/generate-create-table.sql
--   Then copy the output and replace Step 1 below
--
-- Option B: Use the JS migration script (auto-detects schema):
--   node scripts/migrate-clickhouse-phase1.js
--
-- Option C: Manually check schema:
--   DESCRIBE TABLE analytics.visit_logs;
--   Then manually create the table with those exact columns

-- ============================================
-- STEP 1: Create new partitioned table
-- ============================================
-- ⚠️  WARNING: The columns below are a TEMPLATE and may not match your table!
-- 
-- You MUST either:
-- 1. Run scripts/generate-create-table.sql first and use its output, OR
-- 2. Use the JS migration script which auto-detects the schema
--
-- Template (replace with actual columns from your table):
CREATE TABLE IF NOT EXISTS analytics.visit_logs_new (
  -- TODO: Replace with actual columns from DESCRIBE TABLE analytics.visit_logs;
  -- Copy all columns exactly as they appear, maintaining order
  timestamp DateTime,
  session_id String,
  user_id String,
  page_url String,
  page_title String,
  referrer String,
  referrer_domain String,
  tracking_code String DEFAULT '',
  utm_source String,
  utm_medium String,
  utm_campaign String,
  utm_term String,
  utm_content String,
  campaign_id Int32,
  course_id Int32,
  user_agent String,
  device_type String,
  os String,
  browser String,
  screen_resolution String,
  visit_count Int32,
  is_new_visitor UInt8,
  time_on_page Int32,
  event_type String,
  page_sequence Int32 DEFAULT 0,
  is_landing_page UInt8 DEFAULT 0,
  is_exit_page UInt8 DEFAULT 0,
  previous_page_url String DEFAULT '',
  session_page_count Int32 DEFAULT 0,
  conversion_type String DEFAULT '',
  conversion_value Float64 DEFAULT 0,
  conversion_metadata String DEFAULT ''
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(toTimeZone(timestamp, 'Asia/Seoul'))
ORDER BY (toDate(toTimeZone(timestamp, 'Asia/Seoul')), session_id, user_id)
SETTINGS index_granularity = 8192;

-- ============================================
-- STEP 2: Copy data from old table to new table
-- ============================================
-- This may take a while depending on data size
-- Monitor progress in ClickHouse logs
INSERT INTO analytics.visit_logs_new 
SELECT * FROM analytics.visit_logs;

-- ============================================
-- STEP 3: Verify data integrity
-- ============================================
-- Run these queries and ensure counts match:
-- SELECT COUNT(*) FROM analytics.visit_logs;
-- SELECT COUNT(*) FROM analytics.visit_logs_new;
--
-- Also verify a sample:
-- SELECT * FROM analytics.visit_logs ORDER BY timestamp DESC LIMIT 10;
-- SELECT * FROM analytics.visit_logs_new ORDER BY timestamp DESC LIMIT 10;

-- ============================================
-- STEP 4: Swap tables (atomic operation)
-- ============================================
-- This is safe - if it fails, old table remains intact
RENAME TABLE 
  analytics.visit_logs TO analytics.visit_logs_old,
  analytics.visit_logs_new TO analytics.visit_logs;

-- ============================================
-- STEP 5: Add projections for common query patterns
-- ============================================

-- Projection 1: Campaign + Date aggregations
-- Used by: campaign-analysis, performance dashboards
ALTER TABLE analytics.visit_logs 
ADD PROJECTION IF NOT EXISTS campaign_date_projection (
  SELECT 
    toDate(toTimeZone(timestamp, 'Asia/Seoul')) as date,
    campaign_id,
    countDistinct(user_id) as unique_visitors,
    countDistinct(session_id) as sessions,
    countIf(event_type = 'conversion') as conversions,
    SUM(conversion_value) as revenue
  GROUP BY date, campaign_id
);

-- Projection 2: Channel (utm_source) + Date aggregations
-- Used by: channel-performance, performance dashboards
ALTER TABLE analytics.visit_logs 
ADD PROJECTION IF NOT EXISTS channel_date_projection (
  SELECT 
    toDate(toTimeZone(timestamp, 'Asia/Seoul')) as date,
    CASE 
      WHEN utm_source = '' OR utm_source = '(direct)' OR utm_source = 'Direct' THEN 'Direct'
      ELSE utm_source
    END as channel,
    countDistinct(user_id) as visitors,
    countIf(event_type = 'conversion') as conversions,
    SUM(conversion_value) as revenue
  GROUP BY date, channel
);

-- Projection 3: Conversion type + Date aggregations
-- Used by: conversion-analysis
ALTER TABLE analytics.visit_logs 
ADD PROJECTION IF NOT EXISTS conversion_date_projection (
  SELECT 
    toDate(toTimeZone(timestamp, 'Asia/Seoul')) as date,
    conversion_type,
    countIf(conversion_type != '' AND event_type = 'conversion') as count,
    sumIf(conversion_value, conversion_type != '' AND event_type = 'conversion') as total_value,
    countDistinctIf(user_id, conversion_type != '' AND event_type = 'conversion') as unique_users
  GROUP BY date, conversion_type
);

-- Projection 4: Tracking code + Date aggregations
-- Used by: channel-performance, campaign-analysis
ALTER TABLE analytics.visit_logs 
ADD PROJECTION IF NOT EXISTS tracking_code_date_projection (
  SELECT 
    toDate(toTimeZone(timestamp, 'Asia/Seoul')) as date,
    tracking_code,
    utm_source,
    utm_medium,
    utm_campaign,
    uniqIf(session_id, tracking_code != '') as sessions,
    countDistinctIf(user_id, tracking_code != '') as users,
    countIf(tracking_code != '' AND event_type = 'conversion') as conversions
  GROUP BY date, tracking_code, utm_source, utm_medium, utm_campaign
);

-- ============================================
-- STEP 6: Materialize projections
-- ============================================
-- This populates the projections with existing data
-- It may take a while depending on data size
ALTER TABLE analytics.visit_logs MATERIALIZE PROJECTION campaign_date_projection;
ALTER TABLE analytics.visit_logs MATERIALIZE PROJECTION channel_date_projection;
ALTER TABLE analytics.visit_logs MATERIALIZE PROJECTION conversion_date_projection;
ALTER TABLE analytics.visit_logs MATERIALIZE PROJECTION tracking_code_date_projection;

-- ============================================
-- STEP 7: Verify projections are working
-- ============================================
-- Check projection status:
-- SELECT name, type, status FROM system.projection_parts WHERE table = 'visit_logs' AND database = 'analytics';

-- ============================================
-- STEP 8: Cleanup (ONLY after verifying everything works!)
-- ============================================
-- Wait at least 24-48 hours to ensure everything is working correctly
-- Then you can drop the old table:
-- DROP TABLE analytics.visit_logs_old;

-- ============================================
-- Migration Complete!
-- ============================================
-- Your visit_logs table is now:
-- - Partitioned by month for faster date-range queries
-- - Has projections for common aggregations
-- - All existing queries will continue to work
-- - New queries will automatically use projections when beneficial

