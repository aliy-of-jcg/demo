import type { UserStatus } from '@/lib/types';
import type { StatusCheckResult } from './types';

/**
 * Status-based access control rules
 * Defines what access level each status provides
 */
export const STATUS_ACCESS_RULES: Record<
    UserStatus,
    {
        canAccess: boolean;
        accessLevel: 'full' | 'readonly' | 'none';
        message: string;
    }
> = {
    active: {
        canAccess: true,
        accessLevel: 'full',
        message: 'Account is active',
    },
    pending: {
        canAccess: false,
        accessLevel: 'none',
        message: 'Your account is pending approval. Please contact your administrator or wait for activation.',
    },
    stopped: {
        canAccess: true,
        accessLevel: 'readonly',
        message: 'Your account has been stopped. You have read-only access.',
    },
    blocked: {
        canAccess: false,
        accessLevel: 'none',
        message: 'Your account has been blocked. Please contact support if you believe this is an error.',
    },
    hidden: {
        canAccess: false,
        accessLevel: 'none',
        message: 'Account not found', // Generic message for security
    },
};

/**
 * Check if user status allows access
 * This should be checked BEFORE permission checks
 */
export function checkUserStatus(status: UserStatus): StatusCheckResult {
    const rule = STATUS_ACCESS_RULES[status];

    if (!rule.canAccess) {
        // Determine appropriate status code
        let statusCode = 403; // Forbidden by default

        if (status === 'hidden') {
            statusCode = 401; // Unauthorized (pretend account doesn't exist)
        } else if (status === 'pending') {
            statusCode = 403; // Forbidden (waiting for approval)
        } else if (status === 'blocked') {
            statusCode = 403; // Forbidden (security restriction)
        }

        return {
            allowed: false,
            reason: rule.message,
            statusCode,
        };
    }

    return {
        allowed: true,
        accessLevel: rule.accessLevel,
    };
}

/**
 * Check if user status allows full access (not just read-only)
 */
export function isUserActive(status: UserStatus): boolean {
    const rule = STATUS_ACCESS_RULES[status];
    return rule.canAccess && rule.accessLevel === 'full';
}

/**
 * Check if user status allows read-only access
 */
export function isUserReadOnly(status: UserStatus): boolean {
    const rule = STATUS_ACCESS_RULES[status];
    return rule.canAccess && rule.accessLevel === 'readonly';
}

/**
 * Check if user status allows any access
 */
export function hasAnyAccess(status: UserStatus): boolean {
    const rule = STATUS_ACCESS_RULES[status];
    return rule.canAccess;
}

/**
 * Get user status message
 */
export function getUserStatusMessage(status: UserStatus): string {
    return STATUS_ACCESS_RULES[status].message;
}

