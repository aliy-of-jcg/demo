"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Save, Settings, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { SystemSettingsMap } from "@/lib/system-settings";
import { fetchWithAuth } from "@/lib/utils/fetch-with-auth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { usePermission } from "@/lib/hooks/usePermission";

// Available options
const TIMEZONES = [
    { value: "Asia/Seoul", label: "Asia/Seoul (KST - UTC+9)" },
    { value: "UTC", label: "UTC (Coordinated Universal Time)" },
    { value: "America/New_York", label: "America/New_York (EST/EDT)" },
    { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT)" },
    { value: "Europe/London", label: "Europe/London (GMT/BST)" },
    { value: "Asia/Shanghai", label: "Asia/Shanghai (CST - UTC+8)" },
    { value: "Asia/Singapore", label: "Asia/Singapore (SGT - UTC+8)" },
    { value: "Europe/Berlin", label: "Europe/Berlin (CET/CEST)" },
    { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT)" },
];

function SystemSettingsPageContent() {
    const t = useTranslations("systemSettings");
    const { hasPermission } = usePermission();

    // Check if user can update system settings (owner/admin only)
    const canUpdate = hasPermission('system:update');
    // Check if user can read system settings (owner/admin/observer)
    const canRead = hasPermission('system:read');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [settings, setSettings] = useState<Partial<SystemSettingsMap>>({
        default_date_range: 7,
        default_timezone: "Asia/Seoul",
        default_campaign_status: "waiting",
        default_user_role: "regular",
        session_timeout_minutes: 2,
        allow_new_signups: true,
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            setError(null);

            // Use fetchWithAuth to include Authorization header
            const response = await fetchWithAuth(`/api/system/settings?t=${Date.now()}`);
            const data = await response.json();

            console.log('API Response:', { status: response.status, data });

            if (!response.ok) {
                // Don't redirect, just show error
                const errorMsg = `API Error ${response.status}: ${data.message || 'Unknown error'}`;
                console.error(errorMsg);
                setError(errorMsg);
                return;
            }

            if (data.success && data.settings) {
                console.log('Fetched settings:', data.settings);
                // Filter out legacy/unsupported settings
                const { default_currency, default_language, ...cleanSettings } = data.settings as any;
                // Ensure all settings have default values
                setSettings({
                    default_date_range: 7,
                    default_timezone: 'Asia/Seoul',
                    default_campaign_status: 'waiting',
                    default_user_role: 'regular',
                    session_timeout_minutes: 2,
                    allow_new_signups: true,
                    ...cleanSettings, // Override with fetched values (without legacy fields)
                });
            } else {
                console.error('Invalid response:', data);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t("loadingError"));
            console.error("Failed to fetch settings:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            setSuccessMessage(null);

            // Filter out legacy/unsupported settings
            const { default_currency, default_language, ...cleanSettings } = settings as any;

            const response = await fetchWithAuth("/api/system/settings", {
                method: "PUT",
                body: JSON.stringify({ settings: cleanSettings }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to save settings");
            }

            setSuccessMessage(t("successMessage"));
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : t("errorMessage"));
            console.error("Failed to save settings:", err);
        } finally {
            setSaving(false);
        }
    };

    // Read-only mode for observers
    const isReadOnly = canRead && !canUpdate;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                            <Settings className="w-8 h-8 text-blue-600 mr-3" />
                            <h1 className="text-3xl font-bold text-gray-900">{t("title")}</h1>
                        </div>
                        <button
                            onClick={fetchSettings}
                            disabled={loading}
                            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Refresh settings"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                    <p className="text-gray-600">{t("subtitle")}</p>
                </div>

                {/* Error Message - Only show data/server errors (auth handled by ProtectedRoute) */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                        <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                        <p className="text-red-800">{error}</p>
                    </div>
                )}

                {/* Success Message */}
                {successMessage && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-800">{successMessage}</p>
                    </div>
                )}

                {/* Settings Form */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    {/* System Defaults Section */}
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {t("sections.defaults")}
                        </h2>

                        <div className="space-y-6">
                            {/* Default Date Range */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t("fields.default_date_range.label")}
                                </label>
                                <p className="text-sm text-gray-500 mb-2">
                                    {t("fields.default_date_range.description")}
                                </p>
                                <input
                                    type="number"
                                    min="1"
                                    max="365"
                                    value={settings.default_date_range || 7}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            default_date_range: parseInt(e.target.value) || 7,
                                        })
                                    }
                                    disabled={isReadOnly}
                                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isReadOnly ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
                                        }`}
                                    placeholder={t("fields.default_date_range.placeholder")}
                                />
                            </div>

                            {/* Default Timezone */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t("fields.default_timezone.label")}
                                </label>
                                <p className="text-sm text-gray-500 mb-2">
                                    {t("fields.default_timezone.description")}
                                </p>
                                <select
                                    value={settings.default_timezone || "Asia/Seoul"}
                                    onChange={(e) =>
                                        setSettings({ ...settings, default_timezone: e.target.value })
                                    }
                                    disabled={isReadOnly}
                                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isReadOnly ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
                                        }`}
                                >
                                    {TIMEZONES.map((tz) => (
                                        <option key={tz.value} value={tz.value}>
                                            {tz.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Default Campaign Status */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t("fields.default_campaign_status.label")}
                                </label>
                                <p className="text-sm text-gray-500 mb-2">
                                    {t("fields.default_campaign_status.description")}
                                </p>
                                <select
                                    value={settings.default_campaign_status || "waiting"}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            default_campaign_status: e.target.value as any,
                                        })
                                    }
                                    disabled={isReadOnly}
                                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isReadOnly ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
                                        }`}
                                >
                                    <option value="active">
                                        {t("fields.default_campaign_status.options.active")}
                                    </option>
                                    <option value="waiting">
                                        {t("fields.default_campaign_status.options.waiting")}
                                    </option>
                                    <option value="paused">
                                        {t("fields.default_campaign_status.options.paused")}
                                    </option>
                                    <option value="ended">
                                        {t("fields.default_campaign_status.options.ended")}
                                    </option>
                                </select>
                            </div>

                            {/* Default User Role */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t("fields.default_user_role.label")}
                                </label>
                                <p className="text-sm text-gray-500 mb-2">
                                    {t("fields.default_user_role.description")}
                                </p>
                                <select
                                    value={settings.default_user_role || "regular"}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            default_user_role: e.target.value as any,
                                        })
                                    }
                                    disabled={isReadOnly}
                                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isReadOnly ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
                                        }`}
                                >
                                    <option value="admin">
                                        {t("fields.default_user_role.options.admin")}
                                    </option>
                                    <option value="observer">
                                        {t("fields.default_user_role.options.observer")}
                                    </option>
                                    <option value="regular">
                                        {t("fields.default_user_role.options.regular")}
                                    </option>
                                </select>
                            </div>

                            {/* Session Timeout */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t("fields.session_timeout_minutes.label")}
                                </label>
                                <p className="text-sm text-gray-500 mb-2">
                                    {t("fields.session_timeout_minutes.description")}
                                </p>
                                <input
                                    type="number"
                                    min="1"
                                    max="10080"
                                    value={settings.session_timeout_minutes || 2}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            session_timeout_minutes: parseInt(e.target.value) || 2,
                                        })
                                    }
                                    disabled={isReadOnly}
                                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isReadOnly ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
                                        }`}
                                    placeholder={t("fields.session_timeout_minutes.placeholder")}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Feature Toggles Section */}
                    <div className="p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {t("sections.features")}
                        </h2>

                        <div className="space-y-4">
                            {/* Allow New Signups */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("fields.allow_new_signups.label")}
                                    </label>
                                    <p className="text-sm text-gray-500">
                                        {t("fields.allow_new_signups.description")}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSettings({
                                            ...settings,
                                            allow_new_signups: !settings.allow_new_signups,
                                        })
                                    }
                                    disabled={isReadOnly}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isReadOnly
                                        ? 'bg-gray-300 cursor-not-allowed opacity-60'
                                        : 'cursor-pointer'
                                        } ${settings.allow_new_signups ? "bg-blue-600" : "bg-gray-300"}`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.allow_new_signups ? "translate-x-5" : "translate-x-0"
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Save Button - Only show if user can update */}
                    {canUpdate && (
                        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        {t("saving")}
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5 mr-2" />
                                        {t("saveSettings")}
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Read-only indicator for observers */}
                    {isReadOnly && (
                        <div className="p-6 bg-gray-50 border-t border-gray-200">
                            <div className="flex items-center justify-center text-sm text-gray-500">
                                <AlertCircle className="w-4 h-4 mr-2" />
                                Read-only mode - You can view settings but cannot modify them
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function SystemSettingsPage() {
    return (
        <ProtectedRoute
            permission="system:read"
            showAccessDeniedMessage={true}
        >
            <SystemSettingsPageContent />
        </ProtectedRoute>
    );
}

