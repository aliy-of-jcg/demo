import type { UserType, UserStatus } from '@/lib/types';
import type { JWTPayload } from '@/lib/jwt';
import type { NextRequest, NextResponse } from 'next/server';
import type { FullPermission } from '@/lib/permissions/types';

/**
 * Authenticated user context
 * Extends JWT payload with status information
 */
export interface AuthenticatedUser extends JWTPayload {
    user_type: UserType;
    status: UserStatus;
}

/**
 * Authorization context extracted from request
 */
export interface AuthContext {
    user: AuthenticatedUser;
    token: string;
}

/**
 * Authorization middleware options
 */
export interface AuthMiddlewareOptions {
    /**
     * Required permissions (user must have at least one)
     */
    permissions?: FullPermission[];

    /**
     * Required roles (user must have at least one)
     */
    roles?: UserType[];

    /**
     * Whether to require active status (default: true)
     */
    requireActive?: boolean;

    /**
     * Custom authorization check function
     */
    customCheck?: (user: AuthenticatedUser) => boolean | Promise<boolean>;
}

/**
 * API route handler type
 */
export type ApiRouteHandler = (
    req: NextRequest,
    context: AuthContext
) => Promise<NextResponse>;

/**
 * Unauthorized handler type
 */
export type UnauthorizedHandler = (
    req: NextRequest,
    reason: string
) => NextResponse;

/**
 * Status check result
 */
export interface StatusCheckResult {
    allowed: boolean;
    reason?: string;
    statusCode?: number;
    accessLevel?: 'full' | 'readonly' | 'none';
}

