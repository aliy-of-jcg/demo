"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Globe, Activity, Users, Eye, TrendingUp, ArrowLeft, FileText, Clock } from 'lucide-react';
import { PageFooter } from '@/components/page-footer';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';
import { useSystemSettings } from '@/lib/contexts/SystemSettingsContext';
import { TrackingStatusBadge } from '@/components/tracking-status-badge';
import { DateRangePicker } from '@/components/date-range-picker';

interface PageData {
  page_url: string;
  page_path: string;
  page_title: string;
  unique_visitors: number;
  visits: number;
  pageviews: number;
  conversions: number;
  conversion_rate: number;
  avg_time_on_page: number;
  first_seen: string;
  last_seen: string;
}

interface Summary {
  total_pages: number;
  total_unique_visitors: number;
  total_visits: number;
  total_pageviews: number;
  total_conversions: number;
}

interface ApiResponse {
  success: boolean;
  domain: string;
  pages: PageData[];
  summary: Summary;
  dateRange: {
    start: string;
    end: string;
  };
}

function DomainPagesPageContent() {
  const params = useParams();
  const router = useRouter();
  const domain = decodeURIComponent(params.domain as string);
  const t = useTranslations('trackedWebsites');
  const { getInitialDateRange, isLoading: settingsLoading } = useSystemSettings();
  const MAX_RANGE_DAYS = 90;

  // Initialize date range only after system settings load to avoid double-fetch
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  // Update date range when system settings load (GA behavior: apply defaults on first page load)
  useEffect(() => {
    if (!settingsLoading && !dateRange) {
      try {
        const initialRange = getInitialDateRange();
        setDateRange(initialRange);
      } catch (err) {
        // If settings fail, keep dateRange null and fetchData will stay idle
      }
    }
  }, [settingsLoading, getInitialDateRange, dateRange]);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to enforce max range and provide user feedback
  const clampDateRange = (startStr: string, endStr: string) => {
    let start = new Date(startStr);
    let end = new Date(endStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { start: startStr, end: endStr, clamped: false };
    }

    // Ensure start <= end
    if (start > end) {
      const tmp = start;
      start = end;
      end = tmp;
    }

    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > MAX_RANGE_DAYS) {
      const clampedStart = new Date(end);
      clampedStart.setDate(clampedStart.getDate() - MAX_RANGE_DAYS);
      return {
        start: clampedStart.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
        clamped: true,
      };
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      clamped: false,
    };
  };

  // Quick date range selection
  const setQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    const rawStart = start.toISOString().split('T')[0];
    const rawEnd = end.toISOString().split('T')[0];
    const { start: finalStart, end: finalEnd, clamped } = clampDateRange(rawStart, rawEnd);

    if (clamped) {
      toast.info(t('dateRange.limitedToMaxDays', { days: MAX_RANGE_DAYS }));
    }

    setDateRange({
      start: finalStart,
      end: finalEnd
    });
  };

  // Fetch data from API
  const fetchData = async () => {
    // Wait until dateRange is available
    if (!dateRange) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        start: dateRange.start,
        end: dateRange.end
      });
      const response = await fetchWithAuth(`/api/analytics/tracked-websites/${encodeURIComponent(domain)}/pages?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      setData(result);
    } catch (err) {
      console.error('Error fetching page breakdown data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait for system settings to load so we fetch once with the correct defaults
    if (settingsLoading || !dateRange) {
      return;
    }

    fetchData();
  }, [dateRange, settingsLoading, domain]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time (seconds to readable format)
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  };

  // Format page path for display
  const formatPagePath = (pagePath: string, pageUrl: string) => {
    if (pagePath && pagePath !== '/') return pagePath;
    try {
      const url = new URL(pageUrl);
      return url.pathname || '/';
    } catch {
      return pagePath || '/';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <Link
          href="/tracked-websites"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-3"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          {t('domainPages.backToTrackedWebsites')}
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
              {domain}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              {t('domainPages.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <TrackingStatusBadge />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 sm:mb-6 bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
          {/* Left: Date Range Picker */}
          {dateRange && (
            <DateRangePicker
              startDate={dateRange.start}
              endDate={dateRange.end}
              onStartDateChange={(date) => {
                if (dateRange && date !== null) {
                  if (!dateRange.end) {
                    setDateRange({ ...dateRange, start: date });
                    return;
                  }
                  const { start, end, clamped } = clampDateRange(date, dateRange.end);
                  if (clamped) {
                    toast.info(t('dateRange.limitedToMaxDays', { days: MAX_RANGE_DAYS }));
                  }
                  setDateRange({ start, end });
                }
              }}
              onEndDateChange={(date) => {
                if (dateRange && date !== null) {
                  if (!dateRange.start) {
                    setDateRange({ ...dateRange, end: date });
                    return;
                  }
                  const { start, end, clamped } = clampDateRange(dateRange.start, date);
                  if (clamped) {
                    toast.info(t('dateRange.limitedToMaxDays', { days: MAX_RANGE_DAYS }));
                  }
                  setDateRange({ start, end });
                }
              }}
              maxRangeDays={MAX_RANGE_DAYS}
              onRangeClamped={() => {
                toast.info(t('dateRange.limitedToMaxDays', { days: MAX_RANGE_DAYS }));
              }}
            />
          )}

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
          <p className="text-red-800">{t('domainPages.errors.error')}: {error}</p>
          <p className="text-red-600 text-sm mt-1">{t('domainPages.errors.tryAgain')}</p>
        </div>
      )}

      {/* Data Display */}
      {!loading && !error && data && (
        <div data-export-content>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">{t('domainPages.summary.totalPages')}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                    {data.summary.total_pages}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-blue-500 opacity-80" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">{t('domainPages.summary.uniqueVisitors')}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                    {data.summary.total_unique_visitors.toLocaleString()}
                  </p>
                </div>
                <Users className="w-8 h-8 text-indigo-500 opacity-80" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">{t('domainPages.summary.totalVisits')}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                    {data.summary.total_visits.toLocaleString()}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-purple-500 opacity-80" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">{t('domainPages.summary.totalPageviews')}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                    {data.summary.total_pageviews.toLocaleString()}
                  </p>
                </div>
                <Eye className="w-8 h-8 text-cyan-500 opacity-80" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">{t('domainPages.summary.conversions')}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                    {data.summary.total_conversions.toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-500 opacity-80" />
              </div>
            </div>
          </div>

          {/* Empty State */}
          {data.pages.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">{t('domainPages.empty.noPages')}</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                {t('domainPages.empty.hint')}
              </p>
            </div>
          )}

          {/* Pages Table - Desktop */}
          {data.pages.length > 0 && (
            <div className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('domainPages.table.page')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('domainPages.table.uniqueVisitors')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('domainPages.table.visits')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('domainPages.table.pageviews')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('domainPages.table.conversions')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('domainPages.table.convRate')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('domainPages.table.avgTime')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('domainPages.table.lastSeen')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.pages.map((page, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-start">
                            <FileText className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900 break-all">
                                {formatPagePath(page.page_path, page.page_url)}
                              </div>
                              {page.page_title && (
                                <div className="text-xs text-gray-500 mt-0.5 truncate max-w-md">
                                  {page.page_title}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {page.unique_visitors.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {page.visits.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {page.pageviews.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                          {page.conversions}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {page.conversion_rate.toFixed(2)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTime(page.avg_time_on_page)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(page.last_seen)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pages Cards - Mobile/Tablet */}
          {data.pages.length > 0 && (
            <div className="lg:hidden bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
              {data.pages.map((page, idx) => (
                <div key={idx} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start mb-3">
                    <FileText className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 break-all mb-1">
                        {formatPagePath(page.page_path, page.page_url)}
                      </h3>
                      {page.page_title && (
                        <p className="text-xs text-gray-500 mb-2">{page.page_title}</p>
                      )}
                      <div className="text-xs text-gray-500">
                        {t('domainPages.mobile.lastSeen')} {formatDate(page.last_seen)}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500 text-xs">{t('domainPages.mobile.uniqueVisitors')}</span>
                      <p className="font-medium text-gray-900">{page.unique_visitors.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">{t('domainPages.mobile.visits')}</span>
                      <p className="font-medium text-gray-900">{page.visits.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">{t('domainPages.mobile.pageviews')}</span>
                      <p className="font-medium text-gray-900">{page.pageviews.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">{t('domainPages.mobile.conversions')}</span>
                      <p className="font-medium text-orange-600">{page.conversions}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">{t('domainPages.mobile.convRate')}</span>
                      <p className="font-medium text-gray-900">{page.conversion_rate.toFixed(2)}%</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">{t('domainPages.mobile.avgTime')}</span>
                      <p className="font-medium text-gray-900">{formatTime(page.avg_time_on_page)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer with extra spacing */}
      <div className="mt-8">
        <PageFooter />
      </div>
    </div>
  );
}

export default function DomainPagesPage() {
  return (
    <ProtectedRoute permission="users:read" showAccessDeniedMessage={true}>
      <DomainPagesPageContent />
    </ProtectedRoute>
  );
}


