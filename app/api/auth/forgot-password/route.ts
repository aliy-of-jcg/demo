import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { sendPasswordResetEmail } from '@/lib/email';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    console.log(`🔑 Forgot Password API - Email: ${email}`);

    // Validation
    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Rate limiting - 3 attempts per hour per email
    const rateLimitKey = `forgot-password:${email}`;
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.FORGOT_PASSWORD);

    if (!rateLimit.success) {
      console.warn('Rate limit exceeded for forgot password:', {
        email,
        retryAfter: rateLimit.retryAfter,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          success: false,
          message: `Too many password reset requests. Please try again in ${Math.ceil((rateLimit.retryAfter || 0) / 60)} minutes.`,
          retryAfter: rateLimit.retryAfter,
        },
        { status: 429 }
      );
    }

    // Check if user exists
    const users = await query<any[]>(
      'SELECT id, email, company_name FROM users WHERE email = ? AND status = ?',
      [email, 'active']
    );

    // Always return success to prevent email enumeration attacks
    // But only send email if user exists
    if (users.length === 0) {
      console.log('Password reset requested for non-existent email:', {
        email,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: 'If an account exists with that email, a password reset link has been sent.',
      });
    }

    const user = users[0];

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Calculate expiration (10 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 10);

    // Invalidate any existing unused tokens for this user
    await query(
      'UPDATE password_reset_tokens SET used = TRUE, used_at = NOW() WHERE user_id = ? AND used = FALSE',
      [user.id]
    );

    // Store reset token in database
    await query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, resetToken, expiresAt]
    );

    // Send password reset email
    try {
      await sendPasswordResetEmail({
        email: user.email,
        resetToken,
        userName: user.company_name,
      });

      console.log('Password reset email sent successfully:', {
        email: user.email,
        userId: user.id,
        expiresAt: expiresAt.toISOString(),
        timestamp: new Date().toISOString(),
      });
    } catch (emailError: any) {
      const errorMessage = emailError?.message || 'Failed to send password reset email';

      console.error('Failed to send password reset email:', {
        error: emailError,
        errorMessage,
        email: user.email,
        userId: user.id,
        timestamp: new Date().toISOString(),
      });

      // Delete the token since we couldn't send the email
      await query('DELETE FROM password_reset_tokens WHERE token = ?', [resetToken]);

      return NextResponse.json(
        {
          success: false,
          message: errorMessage,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with that email, a password reset link has been sent.',
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

