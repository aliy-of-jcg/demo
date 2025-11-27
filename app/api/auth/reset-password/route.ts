import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { sendPasswordResetConfirmation } from '@/lib/email';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { token, password, confirmPassword } = await req.json();

    console.log(`🔐 Reset Password API - Token: ${token ? token.substring(0, 10) + '...' : 'missing'}`);

    // Validation
    if (!token || !password || !confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'Passwords do not match' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Rate limiting - 5 attempts per hour per token
    const rateLimitKey = `reset-password:${token}`;
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.PASSWORD_RESET);

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many password reset attempts. Please try again in ${Math.ceil((rateLimit.retryAfter || 0) / 60)} minutes.`,
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
        u.email,
        u.company_name,
        u.status
      FROM password_reset_tokens prt
      JOIN users u ON prt.user_id = u.id
      WHERE prt.token = ?`,
      [token]
    );

    if (tokens.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired reset token' },
        { status: 401 }
      );
    }

    const tokenData = tokens[0];

    // Check if token has been used
    if (tokenData.used) {
      return NextResponse.json(
        { success: false, message: 'This reset link has already been used' },
        { status: 401 }
      );
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now > expiresAt) {
      return NextResponse.json(
        { success: false, message: 'This reset link has expired. Please request a new one.' },
        { status: 401 }
      );
    }

    // Check user status - handle hidden status specially (pretend account doesn't exist)
    if (tokenData.status === 'hidden') {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Handle other non-active statuses with specific messages
    if (tokenData.status !== 'active') {
      let message: string;
      let statusCode = 403;

      switch (tokenData.status) {
        case 'pending':
          message = 'Your account is pending approval. Please contact your administrator or wait for activation.';
          break;
        case 'stopped':
          message = 'Your account has been stopped. Please contact support for assistance.';
          break;
        case 'blocked':
          message = 'Your account has been blocked. Please contact support if you believe this is an error.';
          break;
        default:
          message = 'Invalid email or password';
          statusCode = 401;
      }

      return NextResponse.json(
        { success: false, message },
        { status: statusCode }
      );
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user password
    await query(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [passwordHash, tokenData.user_id]
    );

    // Mark token as used
    await query(
      'UPDATE password_reset_tokens SET used = TRUE, used_at = NOW() WHERE id = ?',
      [tokenData.id]
    );

    // Invalidate all other unused tokens for this user
    await query(
      'UPDATE password_reset_tokens SET used = TRUE, used_at = NOW() WHERE user_id = ? AND id != ? AND used = FALSE',
      [tokenData.user_id, tokenData.id]
    );

    // Invalidate all sessions for this user (force re-login)
    await query(
      'DELETE FROM sessions WHERE user_id = ?',
      [tokenData.user_id]
    );

    console.log('Password reset successful:', {
      userId: tokenData.user_id,
      email: tokenData.email,
      timestamp: new Date().toISOString(),
    });

    // Send confirmation email (non-blocking)
    sendPasswordResetConfirmation({
      email: tokenData.email,
      userName: tokenData.company_name,
    }).catch(error => {
      console.error('Failed to send password reset confirmation email:', error);
      // Don't fail the request if confirmation email fails
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset successful. You can now log in with your new password.',
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

