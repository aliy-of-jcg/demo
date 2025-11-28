'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermission } from '@/lib/hooks/usePermission';
import type { FullPermission } from '@/lib/permissions/types';
import { Lock } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    permission?: FullPermission;
    permissions?: FullPermission[];
    requireAll?: boolean;
    redirectTo?: string;
    requireActive?: boolean;
    showAccessDeniedMessage?: boolean; // Show message instead of redirecting
}

/**
 * ProtectedRoute - Redirects unauthorized users away from protected pages
 * 
 * Use this to protect entire pages/routes based on permissions
 * 
 * @example
 * export default function UserManagementPage() {
 *   return (
 *     <ProtectedRoute permission="users:read">
 *       <UserManagementContent />
 *     </ProtectedRoute>
 *   );
 * }
 */
export function ProtectedRoute({
    children,
    permission,
    permissions,
    requireAll = false,
    redirectTo = '/',
    requireActive = true,
    showAccessDeniedMessage = false,
}: ProtectedRouteProps) {
    const router = useRouter();
    const { user, isAuthenticated, isLoading } = useAuth();
    const { hasPermission, hasAnyPermission, hasAllPermissions, canAccess } = usePermission();

    useEffect(() => {
        // Wait for auth to load
        if (isLoading) {
            return;
        }

        // Check authentication
        if (!isAuthenticated || !user) {
            router.replace('/auth');
            return;
        }

        // Check status (via canAccess which includes status check)
        if (requireActive && !canAccess) {
            router.replace('/auth?error=account_inactive');
            return;
        }

        // If showAccessDeniedMessage is true, don't redirect - show message instead
        if (showAccessDeniedMessage) {
            return;
        }

        // Check permissions
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
            // No permission specified - just check authentication
            hasAccess = true;
        }

        if (!hasAccess) {
            router.replace(redirectTo);
            return;
        }
    }, [isLoading, isAuthenticated, user, permission, permissions, requireAll, redirectTo, router, hasPermission, hasAnyPermission, hasAllPermissions, requireActive, canAccess, showAccessDeniedMessage]);

    // Show loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    // Show nothing while redirecting
    if (!isAuthenticated || !user) {
        return null;
    }

    // Check permissions synchronously for render
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
        hasAccess = true;
    }

    if (!hasAccess) {
        if (showAccessDeniedMessage) {
            return (
                <div className="flex h-[60vh] items-center justify-center p-4">
                    <div className="text-center max-w-md">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                            <Lock className="h-8 w-8 text-red-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
                        <p className="text-gray-600 mb-2">
                            You need to be promoted to <strong>Admin</strong> to access this feature.
                        </p>
                        <p className="text-sm text-gray-500 mb-6">
                            Please contact your administrator to request access.
                        </p>
                        <button
                            onClick={() => router.push('/')}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            );
        }
        return null;
    }

    return <>{children}</>;
}

