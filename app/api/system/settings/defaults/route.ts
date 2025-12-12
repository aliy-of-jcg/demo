import { NextRequest, NextResponse } from 'next/server';
import { getSettingsWithDefaults } from '@/lib/system-settings';
import { requireAuth, type AuthContext } from '@/lib/auth/api-middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/system/settings/defaults
 * Get public system defaults (date_range, timezone)
 * Requires: Authentication only (any logged-in user can access)
 * 
 * This endpoint provides only non-sensitive defaults needed for analytics pages.
 * Full system settings require system:read permission.
 */
export const GET = requireAuth(async (req: NextRequest, context: AuthContext) => {
    try {
        // Get settings with fallback defaults
        const settings = await getSettingsWithDefaults();

        // Return only public defaults (non-sensitive settings)
        // These are needed for analytics pages and form defaults
        const publicDefaults = {
            default_date_range: settings.default_date_range,
            default_timezone: settings.default_timezone,
            default_campaign_status: settings.default_campaign_status,
            default_user_role: settings.default_user_role,
            allow_tracking: settings.allow_tracking,
        };

        return NextResponse.json({
            success: true,
            settings: publicDefaults,
        });
    } catch (error) {
        console.error('Failed to fetch system defaults:', error);
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to fetch system defaults',
                // Return fallback defaults on error
                settings: {
                    default_date_range: 7,
                    default_timezone: 'Asia/Seoul',
                    default_campaign_status: 'waiting',
                    default_user_role: 'regular',
                    allow_tracking: true,
                }
            },
            { status: 500 }
        );
    }
});

