import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import { requirePermissionWithParams, type AuthContext } from '@/lib/auth/api-middleware';

export const dynamic = 'force-dynamic';

// DELETE - Reject/delete a detected domain
export const DELETE = requirePermissionWithParams('settings:update', async (
  request: NextRequest,
  context: AuthContext,
  routeParams: { params: Record<string, string> }
) => {
  try {
    const params = await routeParams.params;
    const domain = params.domain;

    if (!domain) {
      return NextResponse.json(
        { success: false, error: 'Domain parameter is required' },
        { status: 400 }
      );
    }

    const pool = getPool();

    // Delete from detected_domains
    const [result] = await pool.execute(
      'DELETE FROM detected_domains WHERE domain = ?',
      [domain]
    );

    const deleteResult = result as any;

    if (deleteResult.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Domain not found in detected domains' },
        { status: 404 }
      );
    }

    console.log(`✅ Detected domain ${domain} rejected and deleted`);

    return NextResponse.json({
      success: true,
      message: 'Detected domain rejected successfully',
      domain
    });

  } catch (error) {
    console.error('Error rejecting detected domain:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reject domain' },
      { status: 500 }
    );
  }
});

