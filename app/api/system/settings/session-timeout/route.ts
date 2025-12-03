import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/system-settings';

/**
 * GET /api/system/settings/session-timeout
 * Get session timeout for tracking script
 * Public endpoint (no auth required) - used by cosmos-track.js
 */
export async function GET() {
    try {
        // Get session timeout setting (now in minutes)
        const timeoutMinutes = await getSetting('session_timeout_minutes');

        // Return minutes directly (no conversion needed)
        const timeout = timeoutMinutes || 120; // Default: 120 minutes (2 hours)

        return NextResponse.json(
            {
                success: true,
                timeout_minutes: timeout,
            },
            {
                headers: {
                    'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
                },
            }
        );
    } catch (error) {
        console.error('Failed to fetch session timeout:', error);
        // Return default on error
        return NextResponse.json(
            {
                success: true,
                timeout_minutes: 120,
            },
            { status: 200 }
        );
    }
}

