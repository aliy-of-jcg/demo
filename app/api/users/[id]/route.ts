import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { verifyToken } from '@/lib/jwt';

// Update user status or type
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const token = req.headers.get('authorization')?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const decoded = verifyToken(token);
        if (!decoded || decoded.user_type !== 'owner') {
            return NextResponse.json(
                { success: false, message: 'Access denied. Owner privileges required.' },
                { status: 403 }
            );
        }

        const userId = params.id;
        const body = await req.json();
        const { status, user_type } = body;

        // Check if user exists and is not an owner
        const existingUsers = await query<any[]>(
            'SELECT id, user_type FROM users WHERE id = ?',
            [userId]
        );

        if (existingUsers.length === 0) {
            return NextResponse.json(
                { success: false, message: 'User not found' },
                { status: 404 }
            );
        }

        const existingUser = existingUsers[0];

        // Prevent modification of owner accounts
        if (existingUser.user_type === 'owner') {
            return NextResponse.json(
                { success: false, message: 'Cannot modify owner accounts' },
                { status: 403 }
            );
        }

        // Build update query dynamically
        const updates: string[] = [];
        const values: any[] = [];

        if (status) {
            if (!['pending', 'active', 'stopped', 'blocked'].includes(status)) {
                return NextResponse.json(
                    { success: false, message: 'Invalid status' },
                    { status: 400 }
                );
            }
            updates.push('status = ?');
            values.push(status);
        }

        if (user_type) {
            if (!['admin', 'observer', 'regular'].includes(user_type)) {
                return NextResponse.json(
                    { success: false, message: 'Invalid user type' },
                    { status: 400 }
                );
            }
            updates.push('user_type = ?');
            values.push(user_type);
        }

        if (updates.length === 0) {
            return NextResponse.json(
                { success: false, message: 'No valid fields to update' },
                { status: 400 }
            );
        }

        values.push(userId);

        await query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        return NextResponse.json({
            success: true,
            message: 'User updated successfully',
        });

    } catch (error: any) {
        console.error('Error updating user:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Soft delete user (set to hidden)
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const token = req.headers.get('authorization')?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const decoded = verifyToken(token);
        if (!decoded || decoded.user_type !== 'owner') {
            return NextResponse.json(
                { success: false, message: 'Access denied. Owner privileges required.' },
                { status: 403 }
            );
        }

        const userId = params.id;

        // Check if user exists and is not an owner
        const existingUsers = await query<any[]>(
            'SELECT id, user_type FROM users WHERE id = ?',
            [userId]
        );

        if (existingUsers.length === 0) {
            return NextResponse.json(
                { success: false, message: 'User not found' },
                { status: 404 }
            );
        }

        const existingUser = existingUsers[0];

        // Prevent deletion of owner accounts
        if (existingUser.user_type === 'owner') {
            return NextResponse.json(
                { success: false, message: 'Cannot delete owner accounts' },
                { status: 403 }
            );
        }

        // Soft delete by setting status to hidden
        await query(
            'UPDATE users SET status = ? WHERE id = ?',
            ['hidden', userId]
        );

        return NextResponse.json({
            success: true,
            message: 'User deleted successfully',
        });

    } catch (error: any) {
        console.error('Error deleting user:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}


