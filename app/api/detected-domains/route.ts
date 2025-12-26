import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import { requirePermission, type AuthContext } from '@/lib/auth/api-middleware';

export const dynamic = 'force-dynamic';

// GET - List all detected domains
export const GET = requirePermission('settings:read', async (request: NextRequest, context: AuthContext) => {
  try {
    const pool = getPool();
    
    // Get all detected domains ordered by detection count (most detected first)
    const [rows] = await pool.execute(
      `SELECT 
        domain,
        first_detected_at,
        last_detected_at,
        detection_count,
        sample_page_url
      FROM detected_domains
      ORDER BY detection_count DESC, last_detected_at DESC`
    );

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

