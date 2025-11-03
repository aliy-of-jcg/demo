/**
 * Database Initialization Module
 * 
 * This module ensures database tables are created when the application starts.
 * It uses CREATE TABLE IF NOT EXISTS, so it's safe to run multiple times.
 * 
 * Two initialization strategies:
 * 1. Docker-level: MySQL init scripts in /docker-entrypoint-initdb.d/ (runs on first container start)
 * 2. App-level: This module (runs on app startup, acts as backup/fallback)
 */

import { initMySQLSchema } from './mysql';
import { initClickHouseSchema } from './clickhouse';

let initializationStarted = false;
let initializationComplete = false;

/**
 * Initialize all database schemas
 * This is idempotent - safe to call multiple times
 */
export async function initializeDatabases(): Promise<void> {
  // Prevent multiple simultaneous initializations
  if (initializationStarted) {
    return;
  }
  initializationStarted = true;

  try {
    console.log('🔄 Initializing database schemas...');

    // Initialize MySQL schema
    try {
      await initMySQLSchema();
    } catch (error) {
      console.error('❌ MySQL initialization failed:', error);
      // Continue with ClickHouse even if MySQL fails
    }

    // Initialize ClickHouse schema
    try {
      await initClickHouseSchema();
    } catch (error) {
      console.error('❌ ClickHouse initialization failed:', error);
    }

    initializationComplete = true;
    console.log('✅ Database initialization completed');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

/**
 * Check if databases are initialized
 */
export function isInitialized(): boolean {
  return initializationComplete;
}

/**
 * Initialize databases if not already done
 * Safe to call multiple times
 */
export async function ensureDatabasesInitialized(): Promise<void> {
  if (!initializationComplete) {
    await initializeDatabases();
  }
}

