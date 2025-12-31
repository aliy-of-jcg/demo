'use client';

import { useTranslations } from 'next-intl';
import { usePageFlowTransitions } from '@/lib/hooks/page-flow-analysis/useTransitions';

interface FlowTransitionsSectionProps {
  startDate: string;
  endDate: string;
  limit: number;
  search?: string;
  domain?: string;
  enabled: boolean;
}

const truncateUrl = (url: string, maxLength: number = 50) => {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
};

export function FlowTransitionsSection({
  startDate,
  endDate,
  limit,
  search,
  domain,
  enabled,
}: FlowTransitionsSectionProps) {
  const t = useTranslations('pageFlowAnalysis');
  const { data, loading, error } = usePageFlowTransitions({
    startDate,
    endDate,
    limit,
    search,
    domain,
    enabled,
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
        <div className="p-3 sm:p-4 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
        </div>
        <div className="p-8">
          <div className="h-32 bg-gray-100 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
        <div className="p-3 sm:p-4 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">{t('pageTransitions.title')}</h2>
        </div>
        <div className="p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{t('errors.loadFailed')}: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

  const totalTransitions = data.reduce((sum, t) => sum + t.count, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
      <div className="p-3 sm:p-4 border-b border-gray-200">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">{t('pageTransitions.title')}</h2>
        <p className="text-xs sm:text-sm text-gray-600">{t('pageTransitions.subtitle')}</p>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pageTransitions.fromPage')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pageTransitions.toPage')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pageTransitions.transitions')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pageTransitions.percentage')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((transition, idx) => {
              const percentage = totalTransitions > 0 ? ((transition.count / totalTransitions) * 100).toFixed(1) : '0.0';
              return (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900" title={transition.from}>
                    {truncateUrl(transition.from, 60)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900" title={transition.to}>
                    <span className="text-blue-600">→</span> {truncateUrl(transition.to, 60)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{transition.count.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 w-12 text-right">{percentage}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="lg:hidden divide-y divide-gray-200">
        {data.map((transition, idx) => {
          const percentage = totalTransitions > 0 ? ((transition.count / totalTransitions) * 100).toFixed(1) : '0.0';
          return (
            <div key={idx} className="p-4 hover:bg-gray-50">
              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-1" title={transition.from}>
                  {t('pageTransitions.fromPage')}: {truncateUrl(transition.from, 50)}
                </p>
                <p className="text-sm font-medium text-gray-900" title={transition.to}>
                  <span className="text-blue-600">→</span> {truncateUrl(transition.to, 50)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 text-xs">{t('pageTransitions.transitions')}</span>
                  <p className="font-medium text-gray-900">{transition.count.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">{t('pageTransitions.percentage')}</span>
                  <p className="font-medium text-gray-900">{percentage}%</p>
                </div>
              </div>
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

