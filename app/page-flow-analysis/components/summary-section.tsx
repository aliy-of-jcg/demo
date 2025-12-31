'use client';

import { useTranslations } from 'next-intl';
import { usePageFlowInsights } from '@/lib/hooks/page-flow-analysis/useInsights';

interface SummarySectionProps {
  startDate: string;
  endDate: string;
  limit: number;
  search?: string;
  domain?: string;
  enabled: boolean;
}

export function SummarySection({
  startDate,
  endDate,
  limit,
  search,
  domain,
  enabled,
}: SummarySectionProps) {
  const t = useTranslations('pageFlowAnalysis');
  const { data, loading, error } = usePageFlowInsights({
    startDate,
    endDate,
    limit,
    search,
    domain,
    enabled,
  });

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-100 p-4 sm:p-6 rounded-lg border border-gray-200 animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
            <div className="h-8 bg-gray-300 rounded w-16 mb-1"></div>
            <div className="h-3 bg-gray-300 rounded w-32"></div>
          </div>
        ))}
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

  if (!data) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-6 rounded-lg border border-blue-200">
        <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">{t('summary.totalSessions')}</h3>
        <p className="text-2xl sm:text-3xl font-bold text-blue-600">{data.totalSessions.toLocaleString()}</p>
        <p className="text-xs text-gray-600 mt-1">{t('summary.uniqueUserSessions')}</p>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 sm:p-6 rounded-lg border border-purple-200">
        <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">{t('summary.totalPageviews')}</h3>
        <p className="text-2xl sm:text-3xl font-bold text-purple-600">{data.totalPageviews.toLocaleString()}</p>
        <p className="text-xs text-gray-600 mt-1">{t('summary.allPageViews')}</p>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 sm:p-6 rounded-lg border border-green-200">
        <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">{t('summary.avgPagesPerSession')}</h3>
        <p className="text-2xl sm:text-3xl font-bold text-green-600">{data.avgPageviewsPerSession}</p>
        <p className="text-xs text-gray-600 mt-1">{t('summary.pagesViewedOnAverage')}</p>
      </div>

      <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 sm:p-6 rounded-lg border border-orange-200">
        <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">{t('summary.landingPages')}</h3>
        <p className="text-2xl sm:text-3xl font-bold text-orange-600">{data.uniqueLandingPagesCount}</p>
        <p className="text-xs text-gray-600 mt-1">{t('summary.uniqueEntryPoints')}</p>
      </div>
    </div>
  );
}

