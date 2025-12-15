/**
 * Next.js Instrumentation Hook
 *
 * Runs once when the Next.js server starts.
 * Intended for startup tasks (DB init, telemetry, feature flags).
 *
 * NOTE:
 * - Do NOT monkey-patch console methods here
 * - Do NOT suppress framework errors globally
 */

export async function register() {
  // Instrumentation must only run in Node.js runtime
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  // ----------------------------
  // Startup logging (optional)
  // ----------------------------
  console.info('[instrumentation] Server starting (nodejs runtime)');

  // ----------------------------
  // Database initialization
  // ----------------------------
  try {
    const { initializeDatabases } = await import('./lib/db-init');

    // Run asynchronously – do not block server startup
    initializeDatabases().catch((err) => {
      console.error('[instrumentation] Database initialization failed:', err);
    });
  } catch (err) {
    // Import-level failures should still be visible
    console.error('[instrumentation] Failed to load db-init module:', err);
  }

  // ----------------------------
  // Optional: mark known framework quirks
  // ----------------------------
  if (process.env.NODE_ENV === 'production') {
    console.info(
      '[instrumentation] Known Next.js Server Actions warning may appear in standalone builds (non-fatal)'
    );
  }
}

/**
 * ❌ What this deliberately avoids (important)
 * 
 * 1. No console.error monkey-patching
 * 
 * Your previous version did this:
 *   console.error = (...)
 * 
 * That is not recommended, because:
 * - It globally affects Next.js internals
 * - It hides future real errors
 * - It makes debugging unpredictable
 * - It does not actually prevent digest crashes
 * 
 * Instrumentation should observe, not intercept.
 * 
 * 2. No error suppression logic
 * 
 * Instrumentation is not an error filter.
 * If Next.js logs a noisy warning:
 * - Let it log
 * - Normalize errors at the source instead (routes, server actions)
 * 
 * 3. No throwing during startup
 * 
 * Even if initialization fails:
 *   initializeDatabases().catch(...)
 * 
 * This is correct:
 * - Server still boots
 * - Errors are visible
 * - App remains available
 */

