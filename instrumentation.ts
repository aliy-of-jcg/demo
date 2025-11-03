/**
 * Next.js Instrumentation Hook
 * 
 * This file runs once when the Next.js server starts.
 * Perfect for database initialization and other startup tasks.
 * 
 * Note: Requires experimental.instrumentationHook = true in next.config.mjs
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only run on server-side
    const { initializeDatabases } = await import('./lib/db-init');
    
    // Initialize databases asynchronously (don't block server startup)
    initializeDatabases().catch((error) => {
      console.error('❌ Failed to initialize databases on startup:', error);
      // Don't throw - let the app start and handle errors gracefully
    });
  }
}

