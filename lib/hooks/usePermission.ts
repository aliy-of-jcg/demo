'use client';

import { useMemo, useCallback } from 'react';
import { useAuth } from './useAuth';
import { hasPermission, hasAnyPermission, hasAllPermissions } from '@/lib/permissions/checker';
import type { FullPermission } from '@/lib/permissions/types';
import { checkUserStatus } from '@/lib/auth/status-checker';

/**
 * usePermission hook return type
 */
export interface UsePermissionReturn {
    hasPermission: (permission: FullPermission) => boolean;
    hasAnyPermission: (permissions: FullPermission[]) => boolean;
    hasAllPermissions: (permissions: FullPermission[]) => boolean;
    canAccess: boolean; // Overall access check (status + permissions)
}

/**
 * Custom hook for checking user permissions
 * 
 * @param requiredPermission - Single permission to check (optional)
 * @param requiredPermissions - Multiple permissions to check (optional, requires any)
 * @param requireAllPermissions - If true, requires all permissions (default: false)
 */
export function usePermission(
    requiredPermission?: FullPermission,
    requiredPermissions?: FullPermission[],
    requireAllPermissions: boolean = false
): UsePermissionReturn {
    const { user, isAuthenticated } = useAuth(false);

    const canAccess = useMemo(() => {
        if (!isAuthenticated || !user) {
            return false;
        }

        // Check user status first (status must allow access)
        const status = user.status || 'active';
        const statusCheck = checkUserStatus(status);

        if (!statusCheck.allowed) {
            return false;
        }

        return true;
    }, [user, isAuthenticated]);

    const checkPermission = useCallback((permission: FullPermission): boolean => {
        if (!user || !isAuthenticated) {
            return false;
        }

        // Check status first
        const status = user.status || 'active';
        const statusCheck = checkUserStatus(status);
        if (!statusCheck.allowed) {
            return false;
        }

        // Check permission
        const result = hasPermission(
            {
                id: user.id,
                user_type: user.user_type,
                status: status,
            },
            permission
        );

        return result.allowed;
    }, [user, isAuthenticated]);

    const checkAnyPermission = useCallback((permissions: FullPermission[]): boolean => {
        if (!user || !isAuthenticated) {
            return false;
        }

        // Check status first
        const status = user.status || 'active';
        const statusCheck = checkUserStatus(status);
        if (!statusCheck.allowed) {
            return false;
        }

        // Check permissions
        const result = hasAnyPermission(
            {
                id: user.id,
                user_type: user.user_type,
                status: status,
            },
            permissions
        );

        return result.allowed;
    }, [user, isAuthenticated]);

    const checkAllPermissions = useCallback((permissions: FullPermission[]): boolean => {
        if (!user || !isAuthenticated) {
            return false;
        }

        // Check status first
        const status = user.status || 'active';
        const statusCheck = checkUserStatus(status);
        if (!statusCheck.allowed) {
            return false;
        }

        // Check permissions
        const result = hasAllPermissions(
            {
                id: user.id,
                user_type: user.user_type,
                status: status,
            },
            permissions
        );

        return result.allowed;
    }, [user, isAuthenticated]);

    // Memoize the permission checks
    const permissionChecks = useMemo(() => {
        if (requiredPermission) {
            return {
                hasPermission: checkPermission(requiredPermission),
                hasAnyPermission: checkAnyPermission([requiredPermission]),
                hasAllPermissions: checkAllPermissions([requiredPermission]),
            };
        }

        if (requiredPermissions && requiredPermissions.length > 0) {
            return {
                hasPermission: false, // Can't check single permission without specifying
                hasAnyPermission: requireAllPermissions
                    ? checkAllPermissions(requiredPermissions)
                    : checkAnyPermission(requiredPermissions),
                hasAllPermissions: checkAllPermissions(requiredPermissions),
            };
        }

        return {
            hasPermission: false,
            hasAnyPermission: false,
            hasAllPermissions: false,
        };
    }, [requiredPermission, requiredPermissions, requireAllPermissions, checkPermission, checkAnyPermission, checkAllPermissions]);

    return {
        hasPermission: checkPermission,
        hasAnyPermission: checkAnyPermission,
        hasAllPermissions: checkAllPermissions,
        canAccess,
    };
}

