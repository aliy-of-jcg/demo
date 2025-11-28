import type {
    UserContext,
    PermissionResource,
    PermissionAction,
    FullPermission,
    PermissionCheckResult,
    OwnershipChecker,
} from './types';
import { roleHasPermission, hasRoleOrHigher } from './definitions';
import type { UserType } from '@/lib/types';

/**
 * Parse permission string into resource and action
 * Supports formats: 'resource:action' or 'resource:action:scope'
 */
export function parsePermission(permission: FullPermission): {
    resource: PermissionResource;
    action: PermissionAction;
    scope?: 'own' | 'all';
} {
    const parts = permission.split(':');
    if (parts.length < 2) {
        throw new Error(`Invalid permission format: ${permission}`);
    }

    const resource = parts[0] as PermissionResource;
    const action = parts[1] as PermissionAction;
    const scope = parts[2] as 'own' | 'all' | undefined;

    return { resource, action, scope };
}

/**
 * Check if user has permission (synchronous version)
 * This is the main permission checking function for basic permission checks
 * 
 * Note: For permissions with 'own' scope, use hasPermissionAsync() with ownershipChecker
 * 
 * @param user - User context to check permissions for
 * @param permission - Permission to check (can include scope like 'campaigns:update:all')
 */
export function hasPermission(
    user: UserContext,
    permission: FullPermission
): PermissionCheckResult {
    // Parse permission
    const { resource, action, scope } = parsePermission(permission);

    // Check if role has this permission
    const hasAccess = roleHasPermission(user.user_type, resource, action);

    if (!hasAccess) {
        return {
            allowed: false,
            reason: `Role '${user.user_type}' does not have permission '${resource}:${action}'`,
        };
    }

    // Handle scope checks (synchronous)
    if (scope === 'all') {
        // 'all' scope means user can access any resource (typically admin/owner)
        return {
            allowed: true,
        };
    }

    if (scope === 'own') {
        // 'own' scope requires ownership verification (async operation)
        // Return indication that async version should be used
        return {
            allowed: false,
            reason: `Permission '${permission}' requires ownership verification. Use hasPermissionAsync() with ownershipChecker and resourceId.`,
        };
    }

    // No scope - permission granted
    return {
        allowed: true,
    };
}

/**
 * Async version of hasPermission that supports ownership checks
 * Use this when checking permissions with 'own' scope
 * 
 * @param user - User context to check permissions for
 * @param permission - Permission to check (can include scope like 'campaigns:update:own')
 * @param ownershipChecker - Async function to check resource ownership for 'own' scope
 * @param resourceId - Resource ID to check ownership for
 */
export async function hasPermissionAsync(
    user: UserContext,
    permission: FullPermission,
    ownershipChecker: OwnershipChecker,
    resourceId: number
): Promise<PermissionCheckResult> {
    // Parse permission
    const { resource, action, scope } = parsePermission(permission);

    // Check if role has this permission
    const hasAccess = roleHasPermission(user.user_type, resource, action);

    if (!hasAccess) {
        return {
            allowed: false,
            reason: `Role '${user.user_type}' does not have permission '${resource}:${action}'`,
        };
    }

    // Handle scope checks
    if (scope === 'all') {
        // 'all' scope means user can access any resource (typically admin/owner)
        return {
            allowed: true,
        };
    }

    if (scope === 'own') {
        // Check ownership
        const ownsResource = await ownershipChecker(user.id, resourceId);
        if (!ownsResource) {
            return {
                allowed: false,
                reason: `User does not own this resource. Permission '${permission}' requires ownership.`,
            };
        }
        return {
            allowed: true,
        };
    }

    // No scope - permission granted
    return {
        allowed: true,
    };
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(
    user: UserContext,
    permissions: FullPermission[]
): PermissionCheckResult {
    for (const permission of permissions) {
        const result = hasPermission(user, permission);
        if (result.allowed) {
            return { allowed: true };
        }
    }

    return {
        allowed: false,
        reason: `User does not have any of the required permissions: ${permissions.join(', ')}`,
    };
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(
    user: UserContext,
    permissions: FullPermission[]
): PermissionCheckResult {
    for (const permission of permissions) {
        const result = hasPermission(user, permission);
        if (!result.allowed) {
            return {
                allowed: false,
                reason: result.reason || `Missing permission: ${permission}`,
            };
        }
    }

    return { allowed: true };
}

/**
 * Check if user has a specific role or higher
 */
export function hasRole(user: UserContext, requiredRole: UserType): boolean {
    return hasRoleOrHigher(user.user_type, requiredRole);
}

/**
 * Check if user has any of the specified roles or higher
 */
export function hasAnyRole(user: UserContext, requiredRoles: UserType[]): boolean {
    return requiredRoles.some((role) => hasRoleOrHigher(user.user_type, role));
}

/**
 * Create a permission checker function for a specific permission
 * Useful for creating reusable permission checkers
 * 
 * Returns a synchronous checker function
 */
export function createPermissionChecker(permission: FullPermission) {
    return (user: UserContext): PermissionCheckResult => {
        return hasPermission(user, permission);
    };
}

