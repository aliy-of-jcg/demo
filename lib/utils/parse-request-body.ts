import { NextRequest, NextResponse } from 'next/server';

/**
 * Safely parse request body with defensive error handling
 * Prevents 500 errors from truncated bodies during deployment
 * Returns 400/415 errors with detailed logging
 * 
 * Specifically handles malformed multipart/form-data requests from bots/crawlers
 * that can cause "Multipart: Boundary not found" errors
 */
export async function parseRequestBody(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';
  const userAgent = req.headers.get('user-agent') || '';
  const url = req.url;

  // Explicitly reject multipart/form-data early to prevent Next.js from attempting to parse it
  // This prevents "Multipart: Boundary not found" errors from RPA bots and crawlers
  if (contentType.includes('multipart/form-data')) {
    console.warn('Rejected multipart request', {
      contentType,
      userAgent,
      url,
      timestamp: new Date().toISOString()
    });

    return {
      error: NextResponse.json(
        { success: false, error: 'multipart/form-data not supported' },
        { status: 415 }
      ),
      body: null
    };
  }

  if (!contentType.startsWith('application/json')) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Expected application/json' },
        { status: 415 }
      ),
      body: null
    };
  }

  const length = Number(req.headers.get('content-length') || 0);
  if (length === 0) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Empty request body' },
        { status: 400 }
      ),
      body: null
    };
  }

  try {
    const body = await req.json();
    return { error: null, body };
  } catch (e: any) {
    if (e?.code === 'ECONNRESET' || e?.message === 'aborted') {
      return {
        error: NextResponse.json(
          { success: false, error: 'Request aborted by client' },
          { status: 499 }
        ),
        body: null
      };
    }

    console.error('Invalid JSON body', {
      message: e?.message,
      contentType,
      userAgent,
      url,
      timestamp: new Date().toISOString()
    });

    return {
      error: NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      ),
      body: null
    };
  }
}

