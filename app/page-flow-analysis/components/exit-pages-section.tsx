'use client';

import { useTranslations } from 'next-intl';
import { usePageFlowExitPages } from '@/lib/hooks/usePageFlowExitPages';

interface ExitPagesSectionProps {
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

export function ExitPagesSection({
  startDate,
  endDate,
  limit,
  search,
  domain,
  enabled,
}: ExitPagesSectionProps) {
  const t = useTranslations('pageFlowAnalysis');
  const { data, loading, error } = usePageFlowExitPages({
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
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">{t('exitPages.title')}</h2>
        </div>
        <div className="p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{t('errors.loadFailed')}: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
      <div className="p-3 sm:p-4 border-b border-gray-200">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">{t('exitPages.title')}</h2>
        <p className="text-xs sm:text-sm text-gray-600">{t('exitPages.subtitle')}</p>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('exitPages.page')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('exitPages.exits')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('exitPages.exitRate')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {!data || data.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">{t('exitPages.noData')}</td>
              </tr>
            ) : (
              data.map((page, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900" title={page.page}>
                    {truncateUrl(page.page, 60)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-orange-600">{page.exits.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <span className={page.exitRate > 50 ? 'text-red-600 font-medium' : 'text-gray-900'}>
                      {page.exitRate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="lg:hidden divide-y divide-gray-200">
        {!data || data.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">{t('exitPages.noData')}</div>
        ) : (
          data.map((page, idx) => (
            <div key={idx} className="p-4 hover:bg-gray-50">
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-900 break-all" title={page.page}>
                  {truncateUrl(page.page, 60)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 text-xs">{t('exitPages.exits')}</span>
                  <p className="font-medium text-orange-600">{page.exits.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">{t('exitPages.exitRate')}</span>
                  <p className={`font-medium ${page.exitRate > 50 ? 'text-red-600' : 'text-gray-900'}`}>
                    {page.exitRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

