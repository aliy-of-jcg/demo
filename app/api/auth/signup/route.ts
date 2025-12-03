import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { generateToken } from '@/lib/jwt';
import { getSetting } from '@/lib/system-settings';
import type { SignupRequest, SignupResponse } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    // Check if new signups are allowed
    const allowNewSignups = await getSetting('allow_new_signups');

    if (allowNewSignups === false) {
      return NextResponse.json(
        {
          success: false,
          message: 'New user registrations are currently disabled. Please contact an administrator.'
        } as SignupResponse,
        { status: 403 }
      );
    }

    const body: SignupRequest = await req.json();
    let { company_name, email, password, contact_number, user_type } = body;

    console.log(`📝 Signup API - Email: ${email}, Company: ${company_name}`);

    // If user_type is not provided, use default from system settings
    if (!user_type) {
      const defaultUserRole = await getSetting('default_user_role');
      user_type = (defaultUserRole as any) || 'regular';
      console.log(`Using default user role: ${user_type}`);
    }

    // Validation
    if (!company_name || !email || !password || !contact_number) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' } as SignupResponse,
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' } as SignupResponse,
        { status: 400 }
      );
    }

    // Password validation
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters' } as SignupResponse,
        { status: 400 }
      );
    }

    // User type validation (owner can only be set manually via database)
    if (user_type === 'owner') {
      return NextResponse.json(
        { success: false, message: 'Owner type can only be set manually via database' } as SignupResponse,
        { status: 400 }
      );
    }

    if (!['admin', 'observer', 'regular'].includes(user_type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid user type. Must be admin, observer, or regular' } as SignupResponse,
        { status: 400 }
      );
    }

    // Check if user already exists (exclude deleted users)
    const existingUser = await query<any[]>(
      'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL',
      [email]
    );

    if (existingUser.length > 0) {
      return NextResponse.json(
        { success: false, message: 'A user with this email already exists' } as SignupResponse,
        { status: 409 }
      );
    }

    // Check if phone number already exists (exclude deleted users)
    const existingPhone = await query<any[]>(
      'SELECT id FROM users WHERE contact_number = ? AND deleted_at IS NULL',
      [contact_number]
    );

    if (existingPhone.length > 0) {
      return NextResponse.json(
        { success: false, message: 'A user with this phone number already exists' } as SignupResponse,
        { status: 409 }
      );
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Generate UUID
    const user_uuid = uuidv4();

    // Create user
    const result = await query<any>(
      'INSERT INTO users (uuid, company_name, email, password_hash, contact_number, user_type) VALUES (?, ?, ?, ?, ?, ?)',
      [user_uuid, company_name, email, password_hash, contact_number, user_type]
    );

    const userId = result.insertId;

    // Generate JWT token
    const token = generateToken({
      userId,
      uuid: user_uuid,
      email,
      user_type,
      company_name,
      contact_number,
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully!',
      user: {
        id: userId,
        uuid: user_uuid,
        email,
        company_name,
        user_type,
      },
      token,
    } as SignupResponse, { status: 201 });

  } catch (error: any) {
    console.error('Error during signup:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' } as SignupResponse,
      { status: 500 }
    );
  }
}
