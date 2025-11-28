'use client';

import { ReactNode } from 'react';
import { usePermission } from '@/lib/hooks/usePermission';
import type { FullPermission } from '@/lib/permissions/types';

interface ProtectedComponentProps {
    children: ReactNode;
    permission?: FullPermission;
    permissions?: FullPermission[];
    requireAll?: boolean;
    fallback?: ReactNode;
    hideOnUnauthorized?: boolean;
}

/**
 * ProtectedComponent - Conditionally renders children based on permissions
 * 
 * @example
 * <ProtectedComponent permission="users:read">
 *   <UserManagement />
 * </ProtectedComponent>
 * 
 * @example
 * <ProtectedComponent permissions={['users:read', 'users:update']} requireAll>
 *   <AdminPanel />
 * </ProtectedComponent>
 */
export function ProtectedComponent({
    children,
    permission,
    permissions,
    requireAll = false,
    fallback = null,
    hideOnUnauthorized = false,
}: ProtectedComponentProps) {
    const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission();

    let hasAccess = false;

    if (permission) {
        hasAccess = hasPermission(permission);
    } else if (permissions && permissions.length > 0) {
        if (requireAll) {
            hasAccess = hasAllPermissions(permissions);
        } else {
            hasAccess = hasAnyPermission(permissions);
        }
    } else {
        // No permission specified - allow access
        hasAccess = true;
    }

    if (!hasAccess) {
        if (hideOnUnauthorized) {
            return null;
        }
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

