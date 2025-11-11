import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Only apply CORS to /api/track and /api/track-internal routes
  if (request.nextUrl.pathname.startsWith('/api/track')) {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Handle actual requests
    const response = NextResponse.next();
    
    // Set CORS headers
    const origin = request.headers.get('origin') || '';
    const allowedOrigins = [
      'https://aptdecor.uz',
      'https://www.aptdecor.uz',
      'https://jcg.asia',
      'https://www.jcg.asia',
    ];

    if (allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/track/:path*',
};

