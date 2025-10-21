import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { valid: false, message: 'Token is required' },
        { status: 400 }
      );
    }

    // Rate limiting - 10 attempts per hour per token
    const rateLimitKey = `validate-token:${token}`;
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.TOKEN_VALIDATION);

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          valid: false,
          message: 'Too many validation attempts. Please try again later.',
        },
        { status: 429 }
      );
    }

    // Query token with user info
    const tokens = await query<any[]>(
      `SELECT 
        prt.id,
        prt.user_id,
        prt.token,
        prt.expires_at,
        prt.used,
        prt.used_at,
        u.email,
        u.company_name
      FROM password_reset_tokens prt
      JOIN users u ON prt.user_id = u.id
      WHERE prt.token = ?`,
      [token]
    );

    if (tokens.length === 0) {
      console.warn('Invalid password reset token attempted:', {
        token: token.substring(0, 10) + '...',
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        { valid: false, message: 'Invalid or expired reset token' },
        { status: 401 }
      );
    }

    const tokenData = tokens[0];

    // Check if token has been used
    if (tokenData.used) {
      console.warn('Used password reset token attempted:', {
        tokenId: tokenData.id,
        usedAt: tokenData.used_at,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        { valid: false, message: 'This reset link has already been used' },
        { status: 401 }
      );
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now > expiresAt) {
      console.warn('Expired password reset token attempted:', {
        tokenId: tokenData.id,
        expiresAt: tokenData.expires_at,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        { valid: false, message: 'This reset link has expired. Please request a new one.' },
        { status: 401 }
      );
    }

    // Token is valid
    // Mask email for privacy (show first 2 chars and domain)
    const emailParts = tokenData.email.split('@');
    const maskedEmail = emailParts[0].length > 2 
      ? emailParts[0].substring(0, 2) + '***@' + emailParts[1]
      : '***@' + emailParts[1];

    return NextResponse.json({
      valid: true,
      email: maskedEmail,
      expiresAt: tokenData.expires_at,
    });

  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { valid: false, message: 'Failed to validate token' },
      { status: 500 }
    );
  }
}

