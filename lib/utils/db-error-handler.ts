/**
 * Database Error Handler Utilities
 * 
 * Classifies database errors into transient (infrastructure) vs non-transient (bugs/schema)
 * to enable appropriate error handling strategies.
 */

/**
 * Checks if an error is a transient infrastructure error (safe to cache/fail open)
 * 
 * Transient errors include:
 * - Network/system errors (ECONNRESET, ETIMEDOUT, etc.)
 * - MySQL connection layer errors (PROTOCOL_CONNECTION_LOST, ER_SERVER_SHUTDOWN, etc.)
 * - Pool/timeout errors
 */
export function isTransientInfraError(err: any): boolean {
  const code = err?.code;
  const msg = String(err?.message || '').toLowerCase();

  // Strong network signals
  const netCodes = new Set([
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'EPIPE',
    'EHOSTUNREACH',
    'EAI_AGAIN',
    'ENOTFOUND',
    'ECONNABORTED'
  ]);

  // MySQL connectivity signals (mysql2 / mysql)
  const mysqlConnCodes = new Set([
    'PROTOCOL_CONNECTION_LOST',
    'ER_SERVER_SHUTDOWN',
    'ER_CON_COUNT_ERROR',
    'ER_TOO_MANY_USER_CONNECTIONS'
  ]);

  if (netCodes.has(code) || mysqlConnCodes.has(code)) return true;

  // Message heuristics (only as a backup)
  if (
    msg.includes('handshake') ||
    msg.includes('connect') ||
    msg.includes('connection') ||
    msg.includes('timeout') ||
    msg.includes('server shutdown') ||
    msg.includes('getaddrinfo')
  ) return true;

  // Negative errno sometimes indicates OS/network; keep but don't rely solely on it
  if (typeof err?.errno === 'number' && err.errno < 0) return true;

  return false;
}

/**
 * Checks if an error is likely a bug or schema error (should alert, not be quietly swallowed)
 * 
 * Non-transient errors include:
 * - SQL syntax errors (ER_PARSE_ERROR)
 * - Schema errors (ER_NO_SUCH_TABLE, ER_BAD_FIELD_ERROR)
 * - Auth/permission errors (ER_ACCESS_DENIED_ERROR)
 * - Data constraint errors (ER_DUP_ENTRY)
 */
export function isLikelyBugOrSchemaError(err: any): boolean {
  const code = err?.code;
  const mysqlBugCodes = new Set([
    'ER_PARSE_ERROR',
    'ER_NO_SUCH_TABLE',
    'ER_BAD_FIELD_ERROR',
    'ER_ACCESS_DENIED_ERROR',
    'ER_DBACCESS_DENIED_ERROR'
  ]);
  return mysqlBugCodes.has(code);
}

/**
 * Returns cached value if available and fresh, otherwise fails open
 * 
 * @param cached - Cached entry with { is_enabled, last_refresh, updated_at }
 * @param now - Current timestamp
 * @param ttl - Cache TTL in milliseconds
 * @returns Cached value if fresh, otherwise true (fail open)
 */
export function cachedOrFailOpen(
  cached: { is_enabled: boolean; last_refresh: number; updated_at: number } | undefined,
  now: number,
  ttl: number
): boolean {
  if (cached && (now - cached.last_refresh) < ttl) {
    return cached.is_enabled;
  }
  return true; // Fail open policy
}

