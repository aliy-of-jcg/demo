import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { verifyToken } from '@/lib/jwt';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

/**
 * Extract authentication token from request
 */
function extractToken(req: NextRequest): string | null {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    return null;
}

/**
 * GET /api/profile
 * Get current user's profile
 */
export async function GET(req: NextRequest) {
    try {
        const token = extractToken(req);
        if (!token) {
            return NextResponse.json(
                { success: false, message: 'Authentication required' },
                { status: 401 }
            );
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            return NextResponse.json(
                { success: false, message: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        const users = await query<any[]>(
            `SELECT id, uuid, email, company_name, contact_number, user_type, status 
             FROM users WHERE id = ?`,
            [decoded.userId]
        );

        if (users.length === 0) {
            return NextResponse.json(
                { success: false, message: 'User not found' },
                { status: 404 }
            );
        }

        const user = users[0];
        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                uuid: user.uuid,
                email: user.email,
                company_name: user.company_name,
                contact_number: user.contact_number,
                user_type: user.user_type,
                status: user.status
            }
        });
    } catch (error: any) {
        console.error('Error fetching profile:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/profile
 * Update current user's profile
 */
export async function PATCH(req: NextRequest) {
    try {
        const token = extractToken(req);
        if (!token) {
            return NextResponse.json(
                { success: false, message: 'Authentication required' },
                { status: 401 }
            );
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            return NextResponse.json(
                { success: false, message: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { email, contact_number, company_name, currentPassword, newPassword } = body;

        // Verify user exists and get current data
        const users = await query<any[]>(
            'SELECT id, email, contact_number, password_hash FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (users.length === 0) {
            return NextResponse.json(
                { success: false, message: 'User not found' },
                { status: 404 }
            );
        }

        const user = users[0];

        // Verify current password
        if (!currentPassword) {
            return NextResponse.json(
                { success: false, message: 'Current password is required' },
                { status: 400 }
            );
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isPasswordValid) {
            return NextResponse.json(
                { success: false, message: 'Current password is incorrect' },
                { status: 400 }
            );
        }

        // Build update query
        const updates: string[] = [];
        const values: any[] = [];

        // Check if this is a password change or profile update
        if (newPassword) {
            // Password change
            if (newPassword.length < 6) {
                return NextResponse.json(
                    { success: false, message: 'New password must be at least 6 characters' },
                    { status: 400 }
                );
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            updates.push('password_hash = ?');
            values.push(hashedPassword);
        } else {
            // Profile update
            if (email) {
                // Check if email is already taken by another user
                if (email !== user.email) {
                    const existingUsers = await query<any[]>(
                        'SELECT id FROM users WHERE email = ? AND id != ?',
                        [email, decoded.userId]
                    );

                    if (existingUsers.length > 0) {
                        return NextResponse.json(
                            { success: false, message: 'Email is already in use' },
                            { status: 400 }
                        );
                    }

                    updates.push('email = ?');
                    values.push(email);
                }
            }

            if (contact_number) {
                // Check if phone number is already taken by another user
                if (contact_number !== user.contact_number) {
                    const existingUsers = await query<any[]>(
                        'SELECT id FROM users WHERE contact_number = ? AND id != ?',
                        [contact_number, decoded.userId]
                    );

                    if (existingUsers.length > 0) {
                        return NextResponse.json(
                            { success: false, message: 'Phone number is already in use' },
                            { status: 400 }
                        );
                    }
                }

                updates.push('contact_number = ?');
                values.push(contact_number);
            }

            if (company_name) {
                updates.push('company_name = ?');
                values.push(company_name);
            }
        }

        if (updates.length === 0) {
            return NextResponse.json(
                { success: false, message: 'No fields to update' },
                { status: 400 }
            );
        }

        // Perform update
        values.push(decoded.userId);
        await query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        // Fetch updated user data
        const updatedUsers = await query<any[]>(
            `SELECT id, uuid, email, company_name, contact_number, user_type, status 
             FROM users WHERE id = ?`,
            [decoded.userId]
        );

        const updatedUser = updatedUsers[0];

        return NextResponse.json({
            success: true,
            message: newPassword ? 'Password changed successfully' : 'Profile updated successfully',
            user: {
                id: updatedUser.id,
                uuid: updatedUser.uuid,
                email: updatedUser.email,
                company_name: updatedUser.company_name,
                contact_number: updatedUser.contact_number,
                user_type: updatedUser.user_type,
                status: updatedUser.status
            }
        });
    } catch (error: any) {
        console.error('Error updating profile:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}

