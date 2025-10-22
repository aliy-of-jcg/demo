import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const pool = getPool();
    
    const query = `DELETE FROM utm_codes WHERE id = ?`;
    await pool.execute(query, [parseInt(id)]);

    return NextResponse.json({
      success: true,
      message: 'Tracking link deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tracking link:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete tracking link' },
      { status: 500 }
    );
  }
}
