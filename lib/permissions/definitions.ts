import type { PermissionResource, PermissionAction, FullPermission, PermissionMatrix } from './types';
import type { UserType } from '@/lib/types';

/**
 * Permission Matrix
 * Defines which roles have access to which resource-action combinations
 * 
 * TypeScript enforces completeness - every role must have every resource defined
 * 
 * Role Hierarchy (implicit):
 * - owner: Highest level (all permissions)
 * - admin: Second level (most permissions except user management)
 * - observer: Third level (read-only access)
 * - regular: Lowest level (limited read access)
 */
export const PERMISSION_MATRIX: PermissionMatrix = {
    owner: {
        users: ['create', 'read', 'update', 'delete', 'manage'],
        campaigns: ['create', 'read', 'update', 'delete', 'manage'],
        courses: ['create', 'read', 'update', 'delete', 'manage'],
        analytics: ['read', 'export'],
        utm_codes: ['create', 'read', 'update', 'delete', 'manage'],
        settings: ['read', 'update', 'manage'],
        system: ['read', 'update', 'manage'],
    },
    admin: {
        users: ['read'], // Can view but not manage
        campaigns: ['create', 'read', 'update', 'delete', 'manage'],
        courses: ['create', 'read', 'update', 'delete', 'manage'],
        analytics: ['read', 'export'],
        utm_codes: ['create', 'read', 'update', 'delete', 'manage'],
        settings: ['read', 'update'], // Limited settings access
        system: [], // No system access
    },
    observer: {
        users: ['read'],
        campaigns: ['read'],
        courses: ['read'],
        analytics: ['read'],
        utm_codes: ['read'],
        settings: [],
        system: ['read'], // Read-only access to system settings
    },
    regular: {
        users: [],
        campaigns: ['read'],
        courses: ['read'],
        analytics: ['read'],
        utm_codes: ['read'],
        settings: [],
        system: [],
    },
};

/**
 * Get all permissions for a given role
 */
export function getPermissionsForRole(role: UserType): FullPermission[] {
    const rolePermissions = PERMISSION_MATRIX[role];
    const permissions: FullPermission[] = [];

    for (const [resource, actions] of Object.entries(rolePermissions) as [
        PermissionResource,
        PermissionAction[],
    ][]) {
        for (const action of actions) {
            permissions.push(`${resource}:${action}` as FullPermission);
        }
    }

    return permissions;
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(
    role: UserType,
    resource: PermissionResource,
    action: PermissionAction
): boolean {
    const rolePermissions = PERMISSION_MATRIX[role];
    const resourcePermissions = rolePermissions[resource] || [];
    return resourcePermissions.includes(action);
}

/**
 * Role hierarchy for permission inheritance
 * Higher roles inherit permissions from lower roles
 */
export const ROLE_HIERARCHY: Record<UserType, number> = {
    owner: 4,
    admin: 3,
    observer: 2,
    regular: 1,
};

/**
 * Check if a role is higher than or equal to another role
 */
export function hasRoleOrHigher(userRole: UserType, requiredRole: UserType): boolean {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

