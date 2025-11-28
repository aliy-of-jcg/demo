import type { UserType, UserStatus } from '@/lib/types';

/**
 * Permission Resources
 * These represent the different areas/resources in the system
 */


export type PermissionResource =
    | 'users'
    | 'campaigns'
    | 'courses'
    | 'analytics'
    | 'utm_codes'
    | 'settings'
    | 'system';

/**
 * Permission Actions
 * These represent what actions can be performed on resources
 */
export type PermissionAction =
    | 'create'
    | 'read'
    | 'update'
    | 'delete'
    | 'manage'
    | 'export';

/**
 * Permission string format: resource:action
 * Examples: 'campaigns:create', 'users:manage', 'analytics:read'
 */
export type Permission = `${PermissionResource}:${PermissionAction}`;

/**
 * Extended permission with ownership scope
 * Examples: 'campaigns:update:own', 'campaigns:update:all'
 */
export type PermissionWithScope = `${Permission}:own` | `${Permission}:all`;

/**
 * Full permission type (with or without scope)
 */
export type FullPermission = Permission | PermissionWithScope;

/**
 * Permission check result
 */
export interface PermissionCheckResult {
    allowed: boolean;
    reason?: string;
}

/**
 * User context for permission checking
 */
export interface UserContext {
    id: number;
    user_type: UserType;
    status: UserStatus;
    uuid?: string;
    email?: string;
    company_name?: string;
}

/**
 * Resource ownership check function type
 * Returns true if user owns the resource
 */
export type OwnershipChecker = (userId: number, resourceId: number) => Promise<boolean>;

/**
 * Permission Matrix Type
 * Enforces that every role has permissions defined for every resource
 * TypeScript will error if any resource is missing for any role
 */
export type PermissionMatrix = {
    [K in UserType]: {
        [R in PermissionResource]: PermissionAction[];
    };
};

