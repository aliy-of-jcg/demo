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
      `SELECT id, uuid, email, company_name, contact_number, user_type, status 
       FROM users WHERE id = ?`,
      [decoded.userId]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { valid: false, message: 'User not found' },
        { status: 401 }
      );
    }

    const user = users[0];

    // Check if user is still active
    if (user.status !== 'active') {
      return NextResponse.json(
        { valid: false, message: 'User account is not active' },
        { status: 403 }
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
