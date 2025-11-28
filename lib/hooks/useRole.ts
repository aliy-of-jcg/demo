'use client';

import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { hasRole, hasAnyRole } from '@/lib/permissions/checker';
import { checkUserStatus } from '@/lib/auth/status-checker';
import type { UserType } from '@/lib/types';

/**
 * useRole hook return type
 */
export interface UseRoleReturn {
    hasRole: (role: UserType) => boolean;
    hasAnyRole: (roles: UserType[]) => boolean;
    isOwner: boolean;
    isAdmin: boolean;
    isObserver: boolean;
    isRegular: boolean;
    canAccess: boolean; // Overall access check (status + role)
}

/**
 * Custom hook for checking user roles
 * 
 * @param requiredRole - Single role to check (optional)
 * @param requiredRoles - Multiple roles to check (optional)
 */
export function useRole(
    requiredRole?: UserType,
    requiredRoles?: UserType[]
): UseRoleReturn {
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

    const roleChecks = useMemo(() => {
        if (!user || !isAuthenticated) {
            return {
                hasRole: () => false,
                hasAnyRole: () => false,
                isOwner: false,
                isAdmin: false,
                isObserver: false,
                isRegular: false,
            };
        }

        const status = user.status || 'active';
        const userContext = {
            id: user.id,
            user_type: user.user_type,
            status: status,
        };

        // Check specific roles
        const checkHasRole = (role: UserType): boolean => {
            // First check status
            const statusCheck = checkUserStatus(status);
            if (!statusCheck.allowed) {
                return false;
            }
            return hasRole(userContext, role);
        };

        const checkHasAnyRole = (roles: UserType[]): boolean => {
            // First check status
            const statusCheck = checkUserStatus(status);
            if (!statusCheck.allowed) {
                return false;
            }
            return hasAnyRole(userContext, roles);
        };

        return {
            hasRole: checkHasRole,
            hasAnyRole: checkHasAnyRole,
            isOwner: checkHasRole('owner'),
            isAdmin: checkHasRole('admin'),
            isObserver: checkHasRole('observer'),
            isRegular: checkHasRole('regular'),
        };
    }, [user, isAuthenticated]);

    // Check required role if provided
    const requiredRoleCheck = useMemo(() => {
        if (!user || !isAuthenticated || !requiredRole) {
            return true; // No requirement, so allowed
        }

        const status = user.status || 'active';
        const statusCheck = checkUserStatus(status);
        if (!statusCheck.allowed) {
            return false;
        }

        return hasRole(
            {
                id: user.id,
                user_type: user.user_type,
                status: status,
            },
            requiredRole
        );
    }, [user, isAuthenticated, requiredRole]);

    // Check required roles if provided
    const requiredRolesCheck = useMemo(() => {
        if (!user || !isAuthenticated || !requiredRoles || requiredRoles.length === 0) {
            return true; // No requirement, so allowed
        }

        const status = user.status || 'active';
        const statusCheck = checkUserStatus(status);
        if (!statusCheck.allowed) {
            return false;
        }

        return hasAnyRole(
            {
                id: user.id,
                user_type: user.user_type,
                status: status,
            },
            requiredRoles
        );
    }, [user, isAuthenticated, requiredRoles]);

    return {
        ...roleChecks,
        canAccess: canAccess && (requiredRoleCheck && requiredRolesCheck),
    };
}

