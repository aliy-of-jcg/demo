import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { requirePermissionWithParams } from '@/lib/auth/api-middleware';
import type { AuthContext } from '@/lib/auth/types';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/users/[id]
 * Update user status or type
 * Requires: users:update permission (owner only for now)
 */
export const PATCH = requirePermissionWithParams('users:update', async (req: NextRequest, context: AuthContext, routeParams: { params: Record<string, string> }) => {
    const { params } = routeParams;
    try {
        const { user } = context;
        const userId = params.id;

        const body = await req.json();
        const { status, user_type } = body;

        // Check if user exists and is not an owner (exclude deleted users)
        const existingUsers = await query<any[]>(
            'SELECT id, user_type FROM users WHERE id = ? AND deleted_at IS NULL',
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
});

/**
 * DELETE /api/users/[id]
 * Soft delete user (set deleted_at timestamp)
 * Requires: users:delete permission (owner only)
 */
export const DELETE = requirePermissionWithParams('users:delete', async (req: NextRequest, context: AuthContext, routeParams: { params: Record<string, string> }) => {
    const { params } = routeParams;
    try {
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

        // Soft delete by setting deleted_at timestamp
        await query(
            'UPDATE users SET deleted_at = NOW() WHERE id = ?',
            [userId]
        );

        // Invalidate all sessions for this user
        await query(
            'DELETE FROM sessions WHERE user_id = ?',
            [userId]
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
});


