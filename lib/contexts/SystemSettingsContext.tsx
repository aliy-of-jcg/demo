"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { SystemSettingsMap } from '@/lib/system-settings';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';

interface SystemSettingsContextType {
    settings: Partial<SystemSettingsMap> | null;
    isLoading: boolean;
    error: string | null;
    // Helper functions
    getDefaultDateRange: () => number;
    getDefaultTimezone: () => string;
    getDefaultCampaignStatus: () => 'active' | 'waiting' | 'paused' | 'ended';
    getDefaultUserRole: () => 'admin' | 'observer' | 'regular';
    // Calculate initial date range (end = today, start = today - default_date_range days)
    getInitialDateRange: () => { start: string; end: string };
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

interface SystemSettingsProviderProps {
    children: ReactNode;
}

/**
 * SystemSettingsProvider
 * Fetches system settings once on mount and provides them to all child components
 * Matches GA behavior: settings are stable during session, only refetch on page reload
 */
export function SystemSettingsProvider({ children }: SystemSettingsProviderProps) {
    const [settings, setSettings] = useState<Partial<SystemSettingsMap> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Fetch settings once on mount (only for authenticated pages)
        // This matches GA behavior: fetch once per session
        const fetchSettings = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Use public defaults endpoint (accessible to all authenticated users)
                // This endpoint returns default_date_range, default_timezone, default_campaign_status, default_user_role
                const response = await fetchWithAuth('/api/system/settings/defaults');
                const data = await response.json();

                console.log('[SystemSettingsProvider] Fetching defaults...', {
                    status: response.status,
                    ok: response.ok,
                    data
                });

                if (!response.ok) {
                    throw new Error(data.message || 'Failed to fetch system defaults');
                }

                if (data.success && data.settings) {
                    console.log('[SystemSettingsProvider] Settings loaded:', data.settings);
                    setSettings(data.settings);
                } else {
                    throw new Error('Invalid response from server');
                }
            } catch (err) {
                console.error('[SystemSettingsProvider] Failed to fetch settings:', err);
                setError(err instanceof Error ? err.message : 'Failed to load system settings');
                // Set fallback defaults on error
                console.warn('[SystemSettingsProvider] Using fallback defaults due to error');
                setSettings({
                    default_date_range: 7,
                    default_timezone: 'Asia/Seoul',
                    default_campaign_status: 'waiting',
                    default_user_role: 'regular',
                });
            } finally {
                setIsLoading(false);
            }
        };

        // Only fetch if user is authenticated (check for auth token)
        const token = localStorage.getItem('auth_token');
        if (token) {
            fetchSettings();
        } else {
            // Not authenticated, skip fetching
            setIsLoading(false);
        }
    }, []); // Empty deps: only fetch once on mount

    // Helper functions
    const getDefaultDateRange = (): number => {
        return settings?.default_date_range ?? 7;
    };

    const getDefaultTimezone = (): string => {
        return settings?.default_timezone ?? 'Asia/Seoul';
    };

    const getDefaultCampaignStatus = (): 'active' | 'waiting' | 'paused' | 'ended' => {
        return (settings?.default_campaign_status as any) ?? 'waiting';
    };

    const getDefaultUserRole = (): 'admin' | 'observer' | 'regular' => {
        return (settings?.default_user_role as any) ?? 'regular';
    };

    const getInitialDateRange = (): { start: string; end: string } => {
        const dateRange = getDefaultDateRange();
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - dateRange);

        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0],
        };
    };

    const value: SystemSettingsContextType = {
        settings,
        isLoading,
        error,
        getDefaultDateRange,
        getDefaultTimezone,
        getDefaultCampaignStatus,
        getDefaultUserRole,
        getInitialDateRange,
    };

    return (
        <SystemSettingsContext.Provider value={value}>
            {children}
        </SystemSettingsContext.Provider>
    );
}

/**
 * Hook to access system settings
 * @throws Error if used outside SystemSettingsProvider
 */
export function useSystemSettings(): SystemSettingsContextType {
    const context = useContext(SystemSettingsContext);
    if (context === undefined) {
        throw new Error('useSystemSettings must be used within a SystemSettingsProvider');
    }
    return context;
}

