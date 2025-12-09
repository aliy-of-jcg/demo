import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import { requirePermission } from '@/lib/auth/api-middleware';
import type { AuthContext } from '@/lib/auth/types';
import { clearCacheByPrefix } from '@/lib/cache/simpleCache';

export const dynamic = 'force-dynamic';

export const PATCH = requirePermission('settings:update', async (request: NextRequest, context: AuthContext) => {
  try {
    const { domain, is_enabled } = await request.json();

    if (!domain || typeof is_enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    const pool = getPool();

    // Update the domain status
    const [result] = await pool.execute(
      'UPDATE tracked_websites SET is_enabled = ?, updated_at = NOW() WHERE domain = ?',
      [is_enabled, domain]
    );

    const updateResult = result as any;

    if (updateResult.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Domain not found' },
        { status: 404 }
      );
    }

    // Invalidate tracked websites analytics cache so UI sees the latest status immediately
    clearCacheByPrefix('tracked-websites:');

    console.log(`✅ Domain ${domain} ${is_enabled ? 'enabled' : 'disabled'}`);

    return NextResponse.json({
      success: true,
      message: `Domain ${is_enabled ? 'enabled' : 'disabled'} successfully`,
      domain,
      is_enabled
    });

  } catch (error) {
    console.error('❌ Error toggling domain status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update domain status',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
});

