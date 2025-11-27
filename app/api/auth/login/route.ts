import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/jwt';
import type { LoginRequest, LoginResponse } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body: LoginRequest = await req.json();
    const { email, password } = body;

    console.log(`🔐 Login API - Email: ${email}`);

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' } as LoginResponse,
        { status: 400 }
      );
    }

    // Fetch user
    const users = await query<any[]>(
      `SELECT 
        id,
        uuid,
        email,
        company_name,
        contact_number,
        password_hash,
        user_type,
        status
      FROM users
      WHERE email = ?`,
      [email]
    );

    // For hidden status or non-existent users, return generic error (prevent account enumeration)
    if (users.length === 0) {
      return NextResponse.json(
        { success: false, message: 'INVALID_CREDENTIALS', errorCode: 'INVALID_CREDENTIALS' } as LoginResponse,
        { status: 401 }
      );
    }

    const user = users[0];

    // Check user status - handle hidden status specially (pretend account doesn't exist)
    if (user.status === 'hidden') {
      // Return generic error to prevent account enumeration
      return NextResponse.json(
        { success: false, message: 'INVALID_CREDENTIALS', errorCode: 'INVALID_CREDENTIALS' } as LoginResponse,
        { status: 401 }
      );
    }

    // Handle other non-active statuses with specific error codes
    if (user.status !== 'active') {
      let errorCode: string;
      let statusCode = 403;

      switch (user.status) {
        case 'pending':
          errorCode = 'ACCOUNT_PENDING';
          break;
        case 'stopped':
          errorCode = 'ACCOUNT_STOPPED';
          break;
        case 'blocked':
          errorCode = 'ACCOUNT_BLOCKED';
          break;
        default:
          errorCode = 'INVALID_CREDENTIALS';
          statusCode = 401;
      }

      return NextResponse.json(
        { success: false, message: errorCode, errorCode } as LoginResponse,
        { status: statusCode }
      );
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, message: 'INVALID_CREDENTIALS', errorCode: 'INVALID_CREDENTIALS' } as LoginResponse,
        { status: 401 }
      );
    }

    // Update last login
    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = ?',
      [user.id]
    );

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      uuid: user.uuid,
      email: user.email,
      user_type: user.user_type,
      company_name: user.company_name,
      contact_number: user.contact_number,
    });

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        company_name: user.company_name,
        contact_number: user.contact_number,
        user_type: user.user_type,
      },
      token,
    } as LoginResponse);

  } catch (error: any) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' } as LoginResponse,
      { status: 500 }
    );
  }
}
