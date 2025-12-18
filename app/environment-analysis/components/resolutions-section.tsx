'use client';

import { useTranslations } from 'next-intl';
import { useEnvironmentResolutions } from '@/lib/hooks/environment-analysis/useResolutions';

interface ResolutionsSectionProps {
    startDate: string;
    endDate: string;
    enabled: boolean;
}

export function ResolutionsSection({
    startDate,
    endDate,
    enabled,
}: ResolutionsSectionProps) {
    const t = useTranslations('environmentAnalysis');
    const { data, loading, error } = useEnvironmentResolutions({
        startDate,
        endDate,
        enabled,
    });

    if (loading) {
        return (
            <div className="bg-gray-100 p-4 sm:p-6 rounded-lg border border-gray-200 mb-4 sm:mb-6 animate-pulse">
                <div className="h-6 bg-gray-300 rounded w-32 mb-4"></div>
                <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-12 bg-gray-300 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 sm:mb-6">
                <p className="text-red-800">{t('errors.loadFailed')}: {error}</p>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return null;
    }

    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">{t('sections.topResolutions')}</h2>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.resolution')}</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.visitors')}</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.pageviews')}</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.share')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {data.map((item, idx) => {
                            const totalVisitors = data.reduce((sum, r) => sum + r.visitors, 0);
                            const share = totalVisitors > 0 ? ((item.visitors / totalVisitors) * 100).toFixed(1) : '0.0';
                            return (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-900">{item.resolution || 'Unknown'}</td>
                                    <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-900">{item.visitors.toLocaleString()}</td>
                                    <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-900">{item.pageviews.toLocaleString()}</td>
                                    <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">{share}%</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

