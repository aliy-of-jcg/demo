-- ============================================
-- Phase 1: Page Flow Tracking Enhancement
-- ClickHouse Schema Migration
-- ============================================
-- 
-- This script adds page flow tracking columns to the visit_logs table
-- Required for: Page Flow Analysis feature
-- 
-- Execute this on your ClickHouse server before deploying Phase 1 code
-- ============================================

-- Add page flow columns to visit_logs table
ALTER TABLE analytics.visit_logs
ADD COLUMN IF NOT EXISTS page_sequence Int32 DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_landing_page UInt8 DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_exit_page UInt8 DEFAULT 0,
ADD COLUMN IF NOT EXISTS previous_page_url String DEFAULT '';

-- Verify columns were added successfully
DESCRIBE analytics.visit_logs;

-- ============================================
-- Notes:
-- ============================================
-- 
-- page_sequence:
--   - Tracks the order of pages viewed within a session
--   - Starts at 1 for first page, increments with each pageview
--   - Resets to 1 when a new session starts
-- 
-- is_landing_page:
--   - 1 if this is the first page of a session (page_sequence = 1)
--   - 0 for all subsequent pages
--   - Used to identify entry points
-- 
-- is_exit_page:
--   - 1 if this is the last page of a session (event_type = 'page_exit')
--   - 0 for all pageviews
--   - Used to identify exit points
-- 
-- previous_page_url:
--   - URL of the page visited immediately before this one
--   - Empty string for landing pages
--   - Used to build navigation flow diagrams
-- 
-- ============================================

