import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { checkUserStatus, isUserActive } from './status-checker';
import { hasAnyPermission, hasAnyRole } from '@/lib/permissions/checker';
import type {
    AuthContext,
    AuthenticatedUser,
    AuthMiddlewareOptions,
    ApiRouteHandler,
    StatusCheckResult,
} from './types';
import type { UserType } from '@/lib/types';
import type { FullPermission } from '@/lib/permissions/types';
import { query } from '@/lib/mysql';

// Re-export types for convenience
export type { AuthContext, AuthenticatedUser, AuthMiddlewareOptions, ApiRouteHandler } from './types';

/**
 * Extract authentication token from request
 */
function extractToken(req: NextRequest): string | null {
    // Try Authorization header first
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // Try cookie (if used)
    const cookieToken = req.cookies.get('auth_token')?.value;
    if (cookieToken) {
        return cookieToken;
    }

    return null;
}

/**
 * Fetch user from database to get current status
 */
async function fetchUserFromDB(userId: number): Promise<AuthenticatedUser | null> {
    try {
        const users = await query<any[]>(
            `SELECT id, uuid, email, company_name, contact_number, user_type, status, deleted_at 
       FROM users WHERE id = ? AND deleted_at IS NULL`,
            [userId]
        );

        if (users.length === 0) {
            return null;
        }

        const user = users[0];

        // Double check deleted_at (though query should filter this)
        if (user.deleted_at) {
            return null;
        }

        return {
            userId: user.id,
            uuid: user.uuid,
            email: user.email,
            user_type: user.user_type as UserType,
            company_name: user.company_name,
            contact_number: user.contact_number,
            status: user.status,
        };
    } catch (error) {
        console.error('Error fetching user from database:', error);
        return null;
    }
}

/**
 * Create unauthorized response
 */
function createUnauthorizedResponse(
    reason: string,
    statusCode: number = 401,
    userStatus?: string,
    reasonCode?: string
): NextResponse {
    return NextResponse.json(
        {
            success: false,
            message: reason,
            error: 'Unauthorized',
            status: userStatus, // Include status for client-side message handling
            reasonCode: reasonCode || getReasonCodeFromStatus(userStatus), // Include reason code for localized messages
        },
        { status: statusCode }
    );
}

/**
 * Create forbidden response
 */
function createForbiddenResponse(reason: string, userStatus?: string, reasonCode?: string): NextResponse {
    return NextResponse.json(
        {
            success: false,
            message: reason,
            error: 'Forbidden',
            status: userStatus, // Include status for client-side message handling
            reasonCode: reasonCode || getReasonCodeFromStatus(userStatus), // Include reason code for localized messages
        },
        { status: 403 }
    );
}

/**
 * Get reason code from user status
 */
function getReasonCodeFromStatus(status?: string): string | undefined {
    if (!status) return undefined;
    switch (status) {
        case 'blocked':
            return 'auth.statusChanged.blocked';
        case 'stopped':
            return 'auth.statusChanged.stopped';
        case 'pending':
            return 'auth.statusChanged.pending';
        default:
            return undefined;
    }
}

/**
 * Main authorization middleware
 * Wraps API route handlers with authentication and authorization checks
 */
export function withAuth(
    handler: ApiRouteHandler,
    options: AuthMiddlewareOptions = {}
): (req: NextRequest) => Promise<NextResponse> {
    return async (req: NextRequest): Promise<NextResponse> => {
        try {
            // 1. Extract token
            const token = extractToken(req);
            if (!token) {
                return createUnauthorizedResponse(
                    'Authentication required. Please provide a valid token.',
                    401,
                    undefined,
                    'auth.sessionExpired'
                );
            }

            // 2. Verify token
            const decoded = verifyToken(token);
            if (!decoded) {
                return createUnauthorizedResponse(
                    'Invalid or expired token.',
                    401,
                    undefined,
                    'auth.sessionExpired'
                );
            }

            // 3. Fetch user from database to get current status
            const user = await fetchUserFromDB(decoded.userId);
            if (!user) {
                return createUnauthorizedResponse(
                    'User not found.',
                    401,
                    undefined,
                    'auth.userNotFound'
                );
            }

            // 4. Check user status (MUST be done before permission checks)
            const statusCheck = checkUserStatus(user.status);
            if (!statusCheck.allowed) {
                return createUnauthorizedResponse(
                    statusCheck.reason || 'Account access denied',
                    statusCheck.statusCode || 403,
                    user.status, // Include user status in response
                    getReasonCodeFromStatus(user.status) // Include reason code for localized messages
                );
            }

            // 5. Check if active status is required (default: true)
            const requireActive = options.requireActive !== false;
            if (requireActive && !isUserActive(user.status)) {
                return createForbiddenResponse(
                    'This operation requires an active account. Your account is currently read-only.',
                    user.status // Include user status in response
                );
            }

            // 6. Check custom authorization if provided
            if (options.customCheck) {
                const customResult = await options.customCheck(user);
                if (!customResult) {
                    return createForbiddenResponse('Custom authorization check failed.');
                }
            }

            // 7. Check role-based authorization
            if (options.roles && options.roles.length > 0) {
                const hasRequiredRole = hasAnyRole(
                    { id: user.userId, user_type: user.user_type, status: user.status },
                    options.roles
                );
                if (!hasRequiredRole) {
                    return createForbiddenResponse(
                        `Access denied. Required role: ${options.roles.join(' or ')}`,
                        user.status,
                        'auth.permissionDenied.roleChanged'
                    );
                }
            }

            // 8. Check permission-based authorization
            if (options.permissions && options.permissions.length > 0) {
                // Check if user has any of the required permissions
                const permissionResult = hasAnyPermission(
                    { id: user.userId, user_type: user.user_type, status: user.status },
                    options.permissions
                );
                if (!permissionResult.allowed) {
                    return createForbiddenResponse(
                        permissionResult.reason || 'Insufficient permissions.',
                        user.status,
                        'auth.permissionDenied.insufficient'
                    );
                }
            }

            // 9. All checks passed - create auth context and call handler
            const authContext: AuthContext = {
                user,
                token,
            };

            return await handler(req, authContext);
        } catch (error) {
            console.error('Authorization middleware error:', error);
            return NextResponse.json(
                {
                    success: false,
                    message: 'Authorization check failed',
                    error: 'Internal server error',
                },
                { status: 500 }
            );
        }
    };
}

/**
 * Convenience function for requiring authentication only
 */
export function requireAuth(handler: ApiRouteHandler): (req: NextRequest) => Promise<NextResponse> {
    return withAuth(handler, { requireActive: true });
}

/**
 * Convenience function for requiring specific permission
 */
export function requirePermission(
    permission: FullPermission,
    handler: ApiRouteHandler,
    options?: { requireActive?: boolean }
): (req: NextRequest) => Promise<NextResponse> {
    return withAuth(handler, {
        permissions: [permission],
        requireActive: options?.requireActive !== false, // Default to true, but allow override
    });
}

/**
 * API route handler type with params support (for dynamic routes)
 */
export type ApiRouteHandlerWithParams = (
    req: NextRequest,
    context: AuthContext,
    routeParams: { params: Record<string, string> }
) => Promise<NextResponse>;

/**
 * Convenience function for requiring specific permission with params support
 * Use this for dynamic routes like /api/users/[id]
 * 
 * The handler receives: (req, authContext, { params })
 */
export function requirePermissionWithParams(
    permission: FullPermission,
    handler: ApiRouteHandlerWithParams
): (req: NextRequest, routeContext: { params: Promise<Record<string, string>> | Record<string, string> }) => Promise<NextResponse> {
    return async (req: NextRequest, routeContext: { params: Promise<Record<string, string>> | Record<string, string> }): Promise<NextResponse> => {
        // Handle async params (Next.js 15+) or sync params (Next.js 14)
        const params = routeContext.params instanceof Promise
            ? await routeContext.params
            : routeContext.params;

        const wrappedHandler: ApiRouteHandler = async (req: NextRequest, authContext: AuthContext) => {
            return handler(req, authContext, { params });
        };
        return withAuth(wrappedHandler, {
            permissions: [permission],
            requireActive: true,
        })(req);
    };
}

/**
 * Convenience function for requiring specific role
 */
export function requireRole(
    roles: UserType[],
    handler: ApiRouteHandler
): (req: NextRequest) => Promise<NextResponse> {
    return withAuth(handler, {
        roles,
        requireActive: true,
    });
}

