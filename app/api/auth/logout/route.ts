import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // In a real app, you might want to:
    // 1. Invalidate the token in the database
    // 2. Clear any server-side sessions
    // For now, we just return success as the client will clear localStorage

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Logout failed' },
      { status: 500 }
    );
  }
}

