import { NextRequest, NextResponse } from 'next/server';
import { getAllSettings, updateSettings, SystemSettingsMap, clearSettingsCache } from '@/lib/system-settings';
import { requirePermission } from '@/lib/auth/api-middleware';
import type { AuthContext } from '@/lib/auth/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/system/settings
 * Get all system settings
 * Requires: system:read permission (owner only)
 */
export const GET = requirePermission('system:read', async (req: NextRequest, context: AuthContext) => {
    try {
        const { user } = context;

        // Get all settings (force fresh fetch by clearing cache first)
        clearSettingsCache();
        const settings = await getAllSettings();

        return NextResponse.json({
            success: true,
            settings,
        });
    } catch (error) {
        console.error('Failed to fetch system settings:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to fetch system settings' },
            { status: 500 }
        );
    }
});

/**
 * PUT /api/system/settings
 * Update system settings
 * Requires: system:update permission (owner only)
 */
export const PUT = requirePermission('system:update', async (req: NextRequest, context: AuthContext) => {
    try {
        const { user } = context;

        // Get settings from request body
        const body = await req.json();
        const { settings } = body as { settings: Partial<SystemSettingsMap> };

        if (!settings || typeof settings !== 'object') {
            return NextResponse.json(
                { success: false, message: 'Invalid settings data' },
                { status: 400 }
            );
        }

        // Validate settings
        const validKeys: (keyof SystemSettingsMap)[] = [
            'default_date_range',
            'default_timezone',
            'default_campaign_status',
            'default_user_role',
            'default_language',
            'session_timeout_minutes',
            'allow_new_signups',
        ];

        const invalidKeys = Object.keys(settings).filter(
            (key) => !validKeys.includes(key as keyof SystemSettingsMap)
        );

        if (invalidKeys.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Invalid setting keys: ${invalidKeys.join(', ')}`,
                },
                { status: 400 }
            );
        }

        // Update settings
        const success = await updateSettings(settings, user.id);

        if (!success) {
            return NextResponse.json(
                { success: false, message: 'Failed to update settings' },
                { status: 500 }
            );
        }

        console.log('System settings updated:', {
            userId: user.id,
            updatedSettings: Object.keys(settings),
            timestamp: new Date().toISOString(),
        });

        return NextResponse.json({
            success: true,
            message: 'Settings updated successfully',
        });
    } catch (error) {
        console.error('Failed to update system settings:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to update system settings' },
            { status: 500 }
        );
    }
});

