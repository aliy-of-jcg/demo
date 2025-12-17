'use client';

import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { usePageFlowLandingPages } from '@/lib/hooks/usePageFlowLandingPages';

interface EntryPagesSectionProps {
  startDate: string;
  endDate: string;
  limit: number;
  search?: string;
  domain?: string;
  enabled: boolean;
  searchInput: string;
  onSearchChange: (value: string) => void;
  selectedDomain: string;
  onDomainChange: (value: string) => void;
  onLimitChange: (value: number) => void;
  domains: { domain: string }[];
  domainsLoading: boolean;
}

const truncateUrl = (url: string, maxLength: number = 50) => {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

export function EntryPagesSection({
  startDate,
  endDate,
  limit,
  search,
  domain,
  enabled,
  searchInput,
  onSearchChange,
  selectedDomain,
  onDomainChange,
  onLimitChange,
  domains,
  domainsLoading,
}: EntryPagesSectionProps) {
  const t = useTranslations('pageFlowAnalysis');
  const { data, loading, error } = usePageFlowLandingPages({
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
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">{t('landingPages.title')}</h2>
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
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">{t('landingPages.title')}</h2>
        <p className="text-xs sm:text-sm text-gray-600">{t('landingPages.subtitle')}</p>
      </div>

      {/* Page Filters - Search, Domain Filter, and Limit Selector */}
      <div className="p-3 sm:p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          {/* Search Input */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('filters.searchPlaceholder')}
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Domain Dropdown */}
          <div className="flex-1 min-w-[200px]">
            <select
              value={selectedDomain}
              onChange={(e) => onDomainChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={domainsLoading}
            >
              <option value="">{t('filters.allDomains')}</option>
              {domains.map((d) => (
                <option key={d.domain} value={d.domain}>
                  {d.domain}
                </option>
              ))}
            </select>
          </div>

          {/* Limit Selector */}
          <div className="flex-shrink-0">
            <select
              value={limit}
              onChange={(e) => onLimitChange(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="20">{t('filters.show20')}</option>
              <option value="50">{t('filters.show50')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('landingPages.page')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('landingPages.visits')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('landingPages.avgPages')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('landingPages.bounceRate')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('landingPages.avgTime')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {!data || data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">{t('landingPages.noData')}</td>
              </tr>
            ) : (
              data.map((page, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900" title={page.page}>
                    {truncateUrl(page.page, 60)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-blue-600">{page.visits.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{page.avgPageviews.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <span className={page.bounceRate > 70 ? 'text-red-600 font-medium' : 'text-gray-900'}>
                      {page.bounceRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{formatTime(page.avgTimeOnPage)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="lg:hidden divide-y divide-gray-200">
        {!data || data.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">{t('landingPages.noData')}</div>
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
                  <span className="text-gray-500 text-xs">{t('landingPages.visits')}</span>
                  <p className="font-medium text-blue-600">{page.visits.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">{t('landingPages.avgPages')}</span>
                  <p className="font-medium text-gray-900">{page.avgPageviews.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">{t('landingPages.bounceRate')}</span>
                  <p className={`font-medium ${page.bounceRate > 70 ? 'text-red-600' : 'text-gray-900'}`}>
                    {page.bounceRate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">{t('landingPages.avgTime')}</span>
                  <p className="font-medium text-gray-900">{formatTime(page.avgTimeOnPage)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

