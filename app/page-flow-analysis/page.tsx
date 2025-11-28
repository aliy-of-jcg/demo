"use client";

import { useState, useEffect } from 'react';
import { Calendar, Search } from 'lucide-react';
import { PageFooter } from '@/components/page-footer';
import { ExportToPDFButton } from '@/components/export-to-pdf-button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useTranslations } from 'next-intl';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';

interface PageData {
  page: string;
  visits: number;
  avgPageviews: number;
  bounceRate: number;
  avgTimeOnPage: number;
}

interface ExitPageData {
  page: string;
  exits: number;
  exitRate: number;
}

interface UTMBreakdown {
  utm_source: string;
  total_sessions: number;
  total_pageviews: number;
  avg_pageviews_per_session: number;
}

interface ApiResponse {
  success: boolean;
  landingPages: PageData[];
  exitPages: ExitPageData[];
  utmBreakdown: UTMBreakdown[];
  insights: {
    totalSessions: number;
    totalPageviews: number;
    avgPageviewsPerSession: string;
    uniqueLandingPagesCount: number;
    avgSessionDepth: string;
  };
}

export default function PageFlowAnalysisPage() {
  const t = useTranslations('pageFlowAnalysis');
  const [dateRange, setDateRange] = useState({
    start: (() => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date.toISOString().split('T')[0];
    })(),
    end: new Date().toISOString().split('T')[0]
  });

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 500);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [domains, setDomains] = useState<{ domain: string }[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(false);

  // Quick date range selection
  const setQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  };

  // Fetch domains for dropdown
  useEffect(() => {
    const fetchDomains = async () => {
      setDomainsLoading(true);
      try {
        const params = new URLSearchParams({
          start: dateRange.start,
          end: dateRange.end
        });
        const response = await fetchWithAuth(`/api/analytics/tracked-websites?${params}`);
        const result = await response.json();

        if (result.success && result.websites) {
          setDomains(result.websites.map((w: { domain: string }) => ({ domain: w.domain })));
        }
      } catch (err) {
        console.error('Error fetching domains:', err);
      } finally {
        setDomainsLoading(false);
      }
    };

    fetchDomains();
  }, [dateRange]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          start_date: dateRange.start,
          end_date: dateRange.end,
          limit: limit.toString()
        });

        if (selectedDomain) {
          params.set('domain', selectedDomain);
        }

        if (debouncedSearch) {
          params.set('search', debouncedSearch);
        }

        const response = await fetchWithAuth(`/api/analytics/page-flow-analysis?${params}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch data');
        }

        setData(result);
      } catch (err) {
        console.error('Error fetching page flow analysis data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange, limit, debouncedSearch, selectedDomain]);

  // Truncate long URLs for display
  const truncateUrl = (url: string, maxLength: number = 50) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  // Format seconds to time string
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">{t('subtitle')}</p>
          </div>
          <ExportToPDFButton
            element="[data-export-content]"
            filename={t('export.filename', { start: dateRange.start, end: dateRange.end })}
            title={t('export.title', { start: dateRange.start, end: dateRange.end })}
            label={t('export.buttonLabel')}
            size="sm"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 sm:mb-6 bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
          {/* Left: Date Range Picker */}
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm flex-1 min-w-[120px]"
            />
            <span className="text-gray-500">~</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm flex-1 min-w-[120px]"
            />
          </div>

          {/* Right: Quick Range Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setQuickRange(7)}
              className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              {t('dateRange.last7Days')}
            </button>
            <button
              onClick={() => setQuickRange(30)}
              className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              {t('dateRange.last30Days')}
            </button>
            <button
              onClick={() => setQuickRange(90)}
              className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              {t('dateRange.last3Months')}
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{t('errors.loadFailed')}: {error}</p>
        </div>
      )}

      {/* Data Display */}
      {!loading && !error && data && (
        <div data-export-content>
          {/* 4 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-6 rounded-lg border border-blue-200">
              <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">{t('summary.totalSessions')}</h3>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600">{data.insights.totalSessions.toLocaleString()}</p>
              <p className="text-xs text-gray-600 mt-1">{t('summary.uniqueUserSessions')}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 sm:p-6 rounded-lg border border-purple-200">
              <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">{t('summary.totalPageviews')}</h3>
              <p className="text-2xl sm:text-3xl font-bold text-purple-600">{data.insights.totalPageviews.toLocaleString()}</p>
              <p className="text-xs text-gray-600 mt-1">{t('summary.allPageViews')}</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 sm:p-6 rounded-lg border border-green-200">
              <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">{t('summary.avgPagesPerSession')}</h3>
              <p className="text-2xl sm:text-3xl font-bold text-green-600">{data.insights.avgPageviewsPerSession}</p>
              <p className="text-xs text-gray-600 mt-1">{t('summary.pagesViewedOnAverage')}</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 sm:p-6 rounded-lg border border-orange-200">
              <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">{t('summary.landingPages')}</h3>
              <p className="text-2xl sm:text-3xl font-bold text-orange-600">{data.insights.uniqueLandingPagesCount}</p>
              <p className="text-xs text-gray-600 mt-1">{t('summary.uniqueEntryPoints')}</p>
            </div>
          </div>

          {/* UTM Performance Comparison Chart */}
          {data.utmBreakdown && data.utmBreakdown.length > 0 && (
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-4">{t('utmChart.title')}</h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">{t('utmChart.subtitle')}</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.utmBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="utm_source"
                    label={{ value: t('utmChart.utmSource'), position: 'insideBottom', offset: -5, style: { fontSize: 11 } }}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    label={{ value: t('utmChart.avgPagesPerSession'), angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    formatter={(value: any, name: string) => {
                      if (name === 'avg_pageviews_per_session') return [value, t('utmChart.avgPagesPerSession')];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `${t('utmChart.utmSource')}: ${label}`}
                    contentStyle={{ fontSize: '12px' }}
                  />
                  <Bar
                    dataKey="avg_pageviews_per_session"
                    fill="#3b82f6"
                    name={t('utmChart.avgPagesPerSession')}
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>

              {/* Page Filters - Search, Domain Filter, and Limit Selector */}
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                  {/* Search Input */}
                  <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder={t('filters.searchPlaceholder')}
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Domain Dropdown */}
                  <div className="flex-1 min-w-[200px]">
                    <select
                      value={selectedDomain}
                      onChange={(e) => setSelectedDomain(e.target.value)}
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
                      onChange={(e) => setLimit(parseInt(e.target.value))}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="20">{t('filters.show20')}</option>
                      <option value="50">{t('filters.show50')}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Landing Pages */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
            <div className="p-3 sm:p-4 border-b border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">{t('landingPages.title')}</h2>
              <p className="text-xs sm:text-sm text-gray-600">{t('landingPages.subtitle')}</p>
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
                  {data.landingPages.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">{t('landingPages.noData')}</td>
                    </tr>
                  ) : (
                    data.landingPages.map((page, idx) => (
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
              {data.landingPages.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">{t('landingPages.noData')}</div>
              ) : (
                data.landingPages.map((page, idx) => (
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

          {/* Exit Pages */}
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
                  {data.exitPages.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-gray-500">{t('exitPages.noData')}</td>
                    </tr>
                  ) : (
                    data.exitPages.map((page, idx) => (
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
              {data.exitPages.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">{t('exitPages.noData')}</div>
              ) : (
                data.exitPages.map((page, idx) => (
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

          {/* Empty State */}
          {data.landingPages.length === 0 && data.exitPages.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">{t('empty.noData')}</p>
              <p className="text-sm text-gray-400 mt-1">{t('empty.hint')}</p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-8">
        <PageFooter />
      </div>
    </div>
  );
}
