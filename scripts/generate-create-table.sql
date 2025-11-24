-- ============================================
-- Helper Script: Generate CREATE TABLE Statement
-- ============================================
-- Run this FIRST to generate the correct CREATE TABLE statement
-- for your existing visit_logs table schema
-- ============================================

-- This query generates a CREATE TABLE statement with all columns
-- from your existing visit_logs table, ready for partitioning migration

SELECT 
  concat(
    'CREATE TABLE IF NOT EXISTS analytics.visit_logs_new (\n',
    arrayStringConcat(
      arrayMap(
        x -> concat('  ', x),
        groupArray(
          concat(
            name, 
            ' ', 
            type,
            if(default_expression != '', concat(' DEFAULT ', default_expression), '')
          )
        )
      ),
      ',\n'
    ),
    '\n) ENGINE = MergeTree()\n',
    'PARTITION BY toYYYYMM(toTimeZone(timestamp, ''Asia/Seoul''))\n',
    'ORDER BY (toDate(toTimeZone(timestamp, ''Asia/Seoul'')), session_id, user_id)\n',
    'SETTINGS index_granularity = 8192;'
  ) as create_statement
FROM (
  SELECT name, type, default_expression
  FROM system.columns
  WHERE database = 'analytics' AND table = 'visit_logs'
  ORDER BY position
);

-- Copy the output and use it in Step 1 of migrate-clickhouse-phase1.sql

