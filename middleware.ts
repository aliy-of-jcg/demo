import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Only apply CORS to /api/track and /api/track-internal routes
  if (request.nextUrl.pathname.startsWith('/api/track')) {
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

  // For all other routes, no special middleware handling is required
  return NextResponse.next();
}

export const config = {
  // Only match tracking API routes for CORS handling
  matcher: ['/api/track/:path*'],
};

