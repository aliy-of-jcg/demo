import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import { requirePermission, type AuthContext } from '@/lib/auth/api-middleware';

export const dynamic = 'force-dynamic';

// GET - List detected domains (pending or rejected)
export const GET = requirePermission('settings:read', async (request: NextRequest, context: AuthContext) => {
  try {
    const pool = getPool();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // 'pending' or 'rejected'
    
    // Build query with optional status filter
    let query = `SELECT 
        domain,
        first_detected_at,
        last_detected_at,
        detection_count,
        sample_page_url,
        status
      FROM detected_domains`;
    
    const queryParams: any[] = [];
    
    if (status === 'pending' || status === 'rejected') {
      query += ' WHERE status = ?';
      queryParams.push(status);
    } else {
      // Default: return pending domains only (for backward compatibility)
      query += ' WHERE status = ? OR status IS NULL';
      queryParams.push('pending');
    }
    
    query += ' ORDER BY detection_count DESC, last_detected_at DESC';
    
    const [rows] = await pool.execute(query, queryParams);

    return NextResponse.json({
      success: true,
      detected_domains: rows
    });

  } catch (error) {
    console.error('Error fetching detected domains:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch detected domains' },
      { status: 500 }
    );
  }
});

