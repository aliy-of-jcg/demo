import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { verifyToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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

        // Fetch all users except owners
        // Convert timestamps from UTC to KST (Asia/Seoul, UTC+9) - same as ClickHouse conversion
        const users = await query<any[]>(
            `SELECT 
        id,
        uuid,
        email,
        company_name,
        contact_number,
        user_type,
        status,
        CONVERT_TZ(created_at, '+00:00', '+09:00') as created_at,
        CONVERT_TZ(last_login_at, '+00:00', '+09:00') as last_login_at
      FROM users
      WHERE user_type != 'owner' AND status != 'hidden'
      ORDER BY created_at DESC`,
            []
        );

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
}


