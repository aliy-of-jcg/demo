// Simple in-memory rate limiter for password reset
// For production with multiple servers, use Redis

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Check rate limit for a given key
 * @param key - Unique identifier (e.g., email or IP address)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // No previous attempts or window expired
  if (!entry || now > entry.resetAt) {
    const resetAt = now + config.windowMs;
    rateLimitStore.set(key, {
      count: 1,
      firstAttempt: now,
      resetAt,
    });

    return {
      success: true,
      remaining: config.maxAttempts - 1,
      resetAt,
    };
  }

  // Within rate limit window
  if (entry.count < config.maxAttempts) {
    entry.count++;
    rateLimitStore.set(key, entry);

    return {
      success: true,
      remaining: config.maxAttempts - entry.count,
      resetAt: entry.resetAt,
    };
  }

  // Rate limit exceeded
  return {
    success: false,
    remaining: 0,
    resetAt: entry.resetAt,
    retryAfter: Math.ceil((entry.resetAt - now) / 1000), // seconds
  };
}

/**
 * Reset rate limit for a key
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Get rate limit status without incrementing
 */
export function getRateLimitStatus(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    return {
      success: true,
      remaining: config.maxAttempts,
      resetAt: now + config.windowMs,
    };
  }

  const remaining = Math.max(0, config.maxAttempts - entry.count);
  const success = remaining > 0;

  return {
    success,
    remaining,
    resetAt: entry.resetAt,
    retryAfter: success ? undefined : Math.ceil((entry.resetAt - now) / 1000),
  };
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // Forgot password: 3 attempts per hour
  FORGOT_PASSWORD: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Password reset: 5 attempts per hour
  PASSWORD_RESET: {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Token validation: 10 attempts per hour
  TOKEN_VALIDATION: {
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
};

