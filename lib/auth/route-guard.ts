import type { UserType } from '@/lib/types';
import type { FullPermission } from '@/lib/permissions/types';

/**
 * Route guard options
 */
export interface RouteGuardOptions {
    /**
     * Required permissions (user must have at least one)
     */
    permissions?: FullPermission[];

    /**
     * Required roles (user must have at least one)
     */
    roles?: UserType[];

    /**
     * Redirect URL if unauthorized (default: '/auth')
     */
    redirectTo?: string;

    /**
     * Whether to require active status (default: true)
     */
    requireActive?: boolean;
}

/**
 * Page-level route guard utility
 * Use this in page components or layout files for server-side protection
 * 
 * Note: This is a helper utility. Full route protection should be done
 * in middleware.ts for better performance and security.
 * 
 * @example
 * ```tsx
 * // app/protected-page/page.tsx
 * import { guardRoute } from '@/lib/auth/route-guard';
 * 
 * export default async function ProtectedPage() {
 *   await guardRoute({ roles: ['admin', 'owner'] });
 *   // ... page content
 * }
 * ```
 */
export async function guardRoute(options: RouteGuardOptions = {}): Promise<void> {
    // This is a placeholder for server-side route guarding
    // Full implementation would:
    // 1. Get session/token from cookies/headers
    // 2. Verify token
    // 3. Check user status
    // 4. Check permissions/roles
    // 5. Redirect if unauthorized

    // For now, route protection is handled in:
    // - middleware.ts (for route-level protection)
    // - LayoutWrapper component (for client-side protection)
    // - useAuth hook (for component-level protection)

    // This function is here for future server-side route protection
    // when using Server Components with Next.js App Router

    // TODO: Implement server-side route guard when needed
    // This would require:
    // - Access to request headers/cookies
    // - Server-side token verification
    // - Database lookup for user status
    // - Permission checking
}

/**
 * Check if a route path is public (doesn't require authentication)
 */
export function isPublicRoute(pathname: string): boolean {
    // Normalize pathname (remove leading/trailing slashes for comparison)
    const normalized = pathname.replace(/^\/+|\/+$/g, '');

    const publicRoutes = [
        'auth',
        'reset-password',
        'link-expired',
        'api/auth/login',
        'api/auth/signup',
        'api/auth/forgot-password',
        'api/auth/reset-password',
        'api/track',
        'api/track-internal',
        'api/health',
    ];

    // Check exact match or starts with
    return publicRoutes.some((route) =>
        normalized === route ||
        normalized.startsWith(route + '/') ||
        pathname === `/${route}` ||
        pathname.startsWith(`/${route}/`)
    );
}

/**
 * Check if a route path is an API route
 */
export function isApiRoute(pathname: string): boolean {
    return pathname.startsWith('/api/');
}

/**
 * Get redirect URL based on authentication status and requested route
 */
export function getAuthRedirectUrl(requestedPath: string): string {
    // Default redirect to auth page
    if (requestedPath.startsWith('/api/')) {
        // API routes don't redirect, they return 401/403
        return '/auth';
    }

    // For page routes, redirect to auth with return URL
    return `/auth?redirect=${encodeURIComponent(requestedPath)}`;
}

