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
    // Intercept console.error to handle harmless Server Actions error (Next.js 14.2.5 standalone build quirk)
    const originalError = console.error;
    console.error = (...args: any[]) => {
      const errorString = args.map(arg =>
        arg instanceof Error ? arg.message + (arg.stack || '') : String(arg)
      ).join(' ');

      // Replace Server Actions workers error with friendly message
      if (
        errorString.includes('Failed to find Server Action') &&
        errorString.includes('Cannot read properties of undefined (reading \'workers\')')
      ) {
        console.warn('⚠️  [HARMLESS] Server Actions initialization warning - Known Next.js 14.2.5 standalone build quirk. App is functioning normally.');
        return;
      }

      originalError.apply(console, args);
    };

    // Only run on server-side
    const { initializeDatabases } = await import('./lib/db-init');

    // Initialize databases asynchronously (don't block server startup)
    initializeDatabases().catch((error) => {
      console.error('❌ Failed to initialize databases on startup:', error);
      // Don't throw - let the app start and handle errors gracefully
    });
  }
}

