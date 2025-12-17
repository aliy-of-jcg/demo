'use client';

import { useTranslations } from 'next-intl';
import { useReturningAnalysisInsights } from '@/lib/hooks/returning-analysis/useInsights';

interface InsightsSectionProps {
  startDate: string;
  endDate: string;
  enabled: boolean;
}

export function InsightsSection({
  startDate,
  endDate,
  enabled,
}: InsightsSectionProps) {
  const t = useTranslations('returningAnalysis');
  const { data, loading, error } = useReturningAnalysisInsights({
    startDate,
    endDate,
    enabled,
  });

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {[1, 2, 3].map((i) => (
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-6 rounded-lg border border-blue-200">
        <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">{t('insights.newVisitors')}</h3>
        <p className="text-2xl sm:text-3xl font-bold text-blue-600">{data.newVisitors.toLocaleString()}</p>
        <p className="text-xs text-gray-600 mt-1">{data.newPercentage}{t('insights.ofTotal')}</p>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 sm:p-6 rounded-lg border border-green-200">
        <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">{t('insights.returningVisitors')}</h3>
        <p className="text-2xl sm:text-3xl font-bold text-green-600">{data.returningVisitors.toLocaleString()}</p>
        <p className="text-xs text-gray-600 mt-1">{data.returningPercentage}{t('insights.ofTotal')}</p>
      </div>

      <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 sm:p-6 rounded-lg border border-orange-200">
        <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">{t('insights.avgReturnInterval')}</h3>
        <p className="text-2xl sm:text-3xl font-bold text-orange-600">{data.avgReturnInterval}</p>
        <p className="text-xs text-gray-600 mt-1">{t('insights.daysBetweenVisits')}</p>
      </div>
    </div>
  );
}

