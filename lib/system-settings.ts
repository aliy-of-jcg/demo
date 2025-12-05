import { query } from '@/lib/mysql';

/**
 * System Settings Utility
 * Provides centralized access to system-wide defaults and feature flags
 */

export interface SystemSetting {
    id: number;
    setting_key: string;
    setting_value: string;
    value_type: 'string' | 'number' | 'boolean' | 'json';
    category: string;
    description: string | null;
    is_editable: boolean;
    updated_by: number | null;
    created_at: Date;
    updated_at: Date;
}

export interface SystemSettingsMap {
    default_date_range: number;
    default_timezone: string;
    default_campaign_status: 'active' | 'waiting' | 'paused' | 'ended';
    default_user_role: 'admin' | 'observer' | 'regular';
    session_timeout_minutes: number;
    allow_new_signups: boolean;
    allow_tracking: boolean;
}

// Cache for settings to avoid repeated DB queries
let settingsCache: Map<string, any> | null = null;
let cacheTimestamp: number = 0;
// Cache TTL for system settings
// GA-style behavior: treat settings as long-lived global config and rely on explicit invalidation
// 24 hours in milliseconds
const CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * Parse setting value based on its type
 */
function parseSettingValue(value: string, type: string): any {
    switch (type) {
        case 'number':
            return parseFloat(value);
        case 'boolean':
            return value === '1' || value === 'true';
        case 'json':
            try {
                return JSON.parse(value);
            } catch {
                return null;
            }
        case 'string':
        default:
            return value;
    }
}

/**
 * Get all system settings as a map
 */
export async function getAllSettings(): Promise<Partial<SystemSettingsMap>> {
    // Check cache
    const now = Date.now();
    if (settingsCache && now - cacheTimestamp < CACHE_TTL) {
        return Object.fromEntries(settingsCache);
    }

    try {
        const settings = await query<SystemSetting[]>(
            'SELECT * FROM system_settings WHERE is_editable = TRUE ORDER BY category, setting_key'
        );

        const settingsMap = new Map<string, any>();
        settings.forEach((setting) => {
            settingsMap.set(
                setting.setting_key,
                parseSettingValue(setting.setting_value, setting.value_type)
            );
        });

        // Update cache
        settingsCache = settingsMap;
        cacheTimestamp = now;

        return Object.fromEntries(settingsMap);
    } catch (error) {
        console.error('Failed to fetch system settings:', error);
        return {};
    }
}

/**
 * Get a specific setting by key
 */
export async function getSetting<K extends keyof SystemSettingsMap>(
    key: K
): Promise<SystemSettingsMap[K] | null> {
    try {
        const settings = await query<SystemSetting[]>(
            'SELECT * FROM system_settings WHERE setting_key = ?',
            [key]
        );

        if (settings.length === 0) {
            return null;
        }

        const setting = settings[0];
        return parseSettingValue(setting.setting_value, setting.value_type);
    } catch (error) {
        console.error(`Failed to fetch setting ${key}:`, error);
        return null;
    }
}

/**
 * Update a system setting
 */
export async function updateSetting<K extends keyof SystemSettingsMap>(
    key: K,
    value: SystemSettingsMap[K],
    updatedBy?: number
): Promise<boolean> {
    try {
        // Convert value to string based on type
        let stringValue: string;
        if (typeof value === 'boolean') {
            stringValue = value ? '1' : '0';
        } else if (typeof value === 'object') {
            stringValue = JSON.stringify(value);
        } else {
            stringValue = String(value);
        }

        await query(
            'UPDATE system_settings SET setting_value = ?, updated_by = ?, updated_at = NOW() WHERE setting_key = ?',
            [stringValue, updatedBy || null, key]
        );

        // Invalidate cache
        settingsCache = null;

        return true;
    } catch (error) {
        console.error(`Failed to update setting ${key}:`, error);
        return false;
    }
}

/**
 * Update multiple settings at once
 */
export async function updateSettings(
    settings: Partial<SystemSettingsMap>,
    updatedBy?: number
): Promise<boolean> {
    try {
        for (const [key, value] of Object.entries(settings)) {
            await updateSetting(key as keyof SystemSettingsMap, value, updatedBy);
        }

        // Invalidate cache
        settingsCache = null;

        return true;
    } catch (error) {
        console.error('Failed to update settings:', error);
        return false;
    }
}

/**
 * Clear settings cache (use after direct DB updates)
 */
export function clearSettingsCache(): void {
    settingsCache = null;
    cacheTimestamp = 0;
}

/**
 * Get settings with fallback defaults
 */
export async function getSettingsWithDefaults(): Promise<SystemSettingsMap> {
    const settings = await getAllSettings();

    return {
        default_date_range: settings.default_date_range ?? 7,
        default_timezone: settings.default_timezone ?? 'Asia/Seoul',
        default_campaign_status: (settings.default_campaign_status as any) ?? 'waiting',
        default_user_role: (settings.default_user_role as any) ?? 'regular',
        session_timeout_minutes: settings.session_timeout_minutes ?? 2,
        allow_new_signups: settings.allow_new_signups ?? true,
        allow_tracking: settings.allow_tracking ?? true,
    };
}

/**
 * Get the system default timezone
 * Uses cached settings for performance
 * @returns IANA timezone string (e.g., 'Asia/Seoul')
 */
export async function getDefaultTimezone(): Promise<string> {
    const settings = await getSettingsWithDefaults();
    return settings.default_timezone;
}

