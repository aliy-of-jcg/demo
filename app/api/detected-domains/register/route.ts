import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import { requirePermission, type AuthContext } from '@/lib/auth/api-middleware';
import { clearCacheByPrefix } from '@/lib/cache/cache';

export const dynamic = 'force-dynamic';

// POST - Register a detected domain to tracked_websites
export const POST = requirePermission('settings:update', async (request: NextRequest, context: AuthContext) => {
  try {
    const { domain } = await request.json();

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid domain parameter' },
        { status: 400 }
      );
    }

    const pool = getPool();

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. Check if domain already exists in tracked_websites
      const [existing] = await connection.execute(
        'SELECT domain FROM tracked_websites WHERE domain = ?',
        [domain]
      );

      if ((existing as any[]).length > 0) {
        await connection.rollback();
        connection.release();
        return NextResponse.json(
          { success: false, error: 'Domain already registered' },
          { status: 409 }
        );
      }

      // 2. Get detection metadata (for first_seen timestamp)
      const [detectedRows] = await connection.execute(
        'SELECT first_detected_at FROM detected_domains WHERE domain = ?',
        [domain]
      );

      const firstDetectedAt = (detectedRows as any[]).length > 0 
        ? (detectedRows as any[])[0].first_detected_at 
        : null;

      // 3. Insert into tracked_websites (enabled by default)
      await connection.execute(
        `INSERT INTO tracked_websites (domain, is_enabled, first_seen, created_at)
         VALUES (?, TRUE, ?, NOW())`,
        [domain, firstDetectedAt || new Date()]
      );

      // 4. Delete from detected_domains (no longer needs to be detected)
      await connection.execute(
        'DELETE FROM detected_domains WHERE domain = ?',
        [domain]
      );

      // Commit transaction
      await connection.commit();
      connection.release();

      // Invalidate caches
      await clearCacheByPrefix('tracked-websites:');

      console.log(`✅ Domain ${domain} registered and enabled`);

      return NextResponse.json({
        success: true,
        message: 'Domain registered successfully',
        domain
      });

    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }

  } catch (error) {
    console.error('Error registering detected domain:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to register domain' },
      { status: 500 }
    );
  }
});

