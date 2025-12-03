import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { requirePermission } from '@/lib/auth/api-middleware';
import type { AuthContext } from '@/lib/auth/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users
 * Fetch all users (except owners and hidden)
 * Requires: users:read permission (admin, observer can read)
 */
export const GET = requirePermission('users:read', async (req: NextRequest, context: AuthContext) => {
    try {
        const { user } = context;

        // Fetch users based on permission level
        let usersQuery: string;
        let queryParams: any[] = [];

        if (user.user_type === 'owner') {
            // Owners can see all non-owner users (exclude deleted users)
            usersQuery = `SELECT 
                id,
                uuid,
                email,
                company_name,
                contact_number,
                user_type,
                status,
                created_at,
                last_login_at
            FROM users
            WHERE user_type != 'owner' AND deleted_at IS NULL
            ORDER BY created_at DESC`;
        } else {
            // Admins and observers can see non-owner users (read-only view, exclude deleted users)
            usersQuery = `SELECT 
                id,
                uuid,
                email,
                company_name,
                contact_number,
                user_type,
                status,
                created_at,
                last_login_at
            FROM users
            WHERE user_type != 'owner' AND deleted_at IS NULL
            ORDER BY created_at DESC`;
        }

        const users = await query<any[]>(usersQuery, queryParams);

        return NextResponse.json({
            success: true,
            users,
        });
    } catch (error: any) {
        console.error('Error fetching users:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
});


