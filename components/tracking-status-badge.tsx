"use client";

import { Info } from "lucide-react";
import { useSystemSettings } from "@/lib/contexts/SystemSettingsContext";
import { usePermission } from "@/lib/hooks/usePermission";
import { useTranslations } from "next-intl";

/**
 * Minimal global tracking state indicator.
 * - Tiny pill, non-intrusive, header/top-bar friendly.
 * - Shows only when tracking is disabled.
 * - Tooltip via title; no blocking, no warning styling.
 */
export function TrackingStatusBadge() {
    const { isLoading, getAllowTracking } = useSystemSettings();
    const { hasPermission } = usePermission();
    const t = useTranslations('trackingBadge');

    if (isLoading || getAllowTracking()) return null;

    const isAdmin = hasPermission('system:update');
    const title = isAdmin ? t('tooltipAdmin') : t('tooltipUser');

    return (
        <span
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 text-xs px-2.5 py-1 border border-amber-200"
            title={title}
        >
            <Info className="w-3.5 h-3.5 text-amber-600" aria-hidden />
            <span className="font-medium">{t('label')}</span>
        </span>
    );
}

