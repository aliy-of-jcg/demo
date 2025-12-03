import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { verifyToken } from '@/lib/jwt';

export interface AuthUser {
  id: number;
  uuid: string;
  email: string;
  company_name: string;
  contact_number: string;
  user_type: string;
}

export interface ValidateTokenResponse {
  valid: boolean;
  user?: AuthUser;
  message?: string;
  status?: string; // User status for client-side message handling
}

// Validate JWT token
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { valid: false, message: 'Token is required' },
        { status: 400 }
      );
    }

    // Verify JWT token using jwt.verify()
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { valid: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Optionally: Re-validate user exists and is still active in database
    // This catches cases where user was deleted/deactivated after token was issued
    const users = await query<any[]>(
      `SELECT id, uuid, email, company_name, contact_number, user_type, status, deleted_at 
       FROM users WHERE id = ? AND deleted_at IS NULL`,
      [decoded.userId]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { valid: false, message: 'Invalid email or password', status: 'deleted' },
        { status: 401 }
      );
    }

    const user = users[0];

    // Check if user is deleted (double check, though query should filter this)
    if (user.deleted_at) {
      return NextResponse.json(
        { valid: false, message: 'Invalid email or password', status: 'deleted' },
        { status: 401 }
      );
    }

    // Handle other non-active statuses with specific messages
    if (user.status !== 'active') {
      let message: string;
      let statusCode = 403;

      switch (user.status) {
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
        { valid: false, message, status: user.status },
        { status: statusCode }
      );
    }

    // Token is valid and user is active
    return NextResponse.json({
      valid: true,
      user: {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        company_name: user.company_name,
        contact_number: user.contact_number,
        user_type: user.user_type,
      },
    } as ValidateTokenResponse);

  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { valid: false, message: 'Token validation failed' },
      { status: 500 }
    );
  }
}
