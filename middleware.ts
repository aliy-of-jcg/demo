import { NextRequest, NextResponse } from 'next/server';
import { isPublicRoute, isApiRoute } from '@/lib/auth/route-guard';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 🔒 Block POST requests to App Router pages (non-API routes)
  // This prevents Server Action runtime from being triggered, eliminating:
  // - "Failed to find Server Action" errors
  // - "Multipart: Boundary not found" errors
  // - Build mismatch issues from cached client bundles
  if (request.method === 'POST' && !pathname.startsWith('/api')) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Handle CORS for tracking routes
  if (pathname.startsWith('/api/track')) {
    const origin = request.headers.get('origin') || '';

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          // Google Analytics approach: echo back the origin (or * if no origin)
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          // No credentials - GA approach for simplicity and compatibility
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Handle actual requests
    const response = NextResponse.next();

    // Google Analytics approach: echo back the origin (allow all domains)
    if (origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    } else {
      response.headers.set('Access-Control-Allow-Origin', '*');
    }

    return response;
  }

  // Skip public routes and API routes - let them through
  // Note: We're not doing redirects in middleware to avoid loops
  // Auth redirects are handled client-side by LayoutWrapper/useAuth hook
  if (isPublicRoute(pathname) || isApiRoute(pathname)) {
    return NextResponse.next();
  }

  // For all other routes, let them through
  // Authentication and authorization are handled client-side (LayoutWrapper)
  // and in individual API route handlers using withAuth middleware
  return NextResponse.next();
}

export const config = {
  // Match all routes except static files and API routes that need CORS
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

