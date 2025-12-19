import { NextRequest, NextResponse } from 'next/server';

/**
 * Safely parse request body with defensive error handling
 * Prevents 500 errors from truncated bodies during deployment
 * Returns 400/415 errors with detailed logging
 */
export async function parseRequestBody(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';
  
  if (!contentType.includes('application/json')) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Expected application/json' },
        { status: 415 }
      ),
      body: null
    };
  }

  try {
    const body = await req.json();
    return { error: null, body };
  } catch (e: any) {
    // Log truncated body during deploy
    console.error('Bad JSON body', {
      message: e?.message,
      contentType,
      contentLength: req.headers.get('content-length'),
      userAgent: req.headers.get('user-agent'),
      url: req.url,
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

