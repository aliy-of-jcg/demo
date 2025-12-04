"use client";

import { useState, useEffect } from 'react';
import { Calendar, Globe, Activity, Users, Eye, TrendingUp, Ban, CheckCircle, Info } from 'lucide-react';
import { PageFooter } from '@/components/page-footer';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { useTranslations } from 'next-intl';
import { usePermission } from '@/lib/hooks/usePermission';
import { ProtectedComponent } from '@/components/auth/ProtectedComponent';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';

interface WebsiteData {
  domain: string;
  total_sessions: number;
  unique_visitors: number;
  total_pageviews: number;
  total_conversions: number;
  first_seen: string;
  last_seen: string;
  is_active: boolean;
  is_enabled: boolean;
  status: 'Active' | 'Inactive' | 'Disabled';
}

interface Summary {
  total_websites: number;
  active_websites: number;
  inactive_websites: number;
  disabled_websites: number;
  total_sessions: number;
  total_visitors: number;
  total_pageviews: number;
  total_conversions: number;
}

interface ApiResponse {
  success: boolean;
  websites: WebsiteData[];
  summary: Summary;
  dateRange: {
    start: string;
    end: string;
  };
}

function TrackedWebsitesPageContent() {
  const t = useTranslations('trackedWebsites');
  const { hasPermission } = usePermission();

  // Check if user can manage tracked websites (settings:update permission)
  const canManageWebsites = hasPermission('settings:update');

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
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'disabled'>('all');
  const [togglingDomain, setTogglingDomain] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  // Toggle website status
  const handleToggleStatus = async (domain: string, currentStatus: boolean) => {
    const result = await Swal.fire({
      title: currentStatus ? t('toggle.title') : t('toggle.titleEnable'),
      text: currentStatus
        ? t('toggle.textDisable', { domain })
        : t('toggle.textEnable', { domain }),
      icon: currentStatus ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonColor: currentStatus ? '#ef4444' : '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: currentStatus ? t('toggle.confirm') : t('toggle.confirmEnable'),
      cancelButtonText: t('toggle.cancel')
    });

    if (!result.isConfirmed) return;

    setTogglingDomain(domain);

    const promise = (async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/tracked-websites/toggle', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({ domain, is_enabled: !currentStatus })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to toggle status');
      }

      await fetchData();
      return result;
    })();

    toast.promise(
      promise,
      {
        loading: currentStatus ? t('toggle.disabling') : t('toggle.enabling'),
        success: currentStatus
          ? t('toggle.disabled', { domain })
          : t('toggle.enabled', { domain }),
        error: (err) => t('toggle.failed', { error: err.message }),
      }
    );

    promise.finally(() => {
      setTogglingDomain(null);
    });
  };

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

  // Fetch data from API
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        start: dateRange.start,
        end: dateRange.end
      });
      const response = await fetchWithAuth(`/api/analytics/tracked-websites?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      setData(result);
    } catch (err) {
      console.error('Error fetching tracked websites data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showTooltip) {
        const target = event.target as HTMLElement;
        if (!target.closest('.group')) {
          setShowTooltip(false);
        }
      }
    };

    if (showTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTooltip]);

  // Filter websites based on status
  const filteredWebsites = data?.websites.filter(website => {
    if (filterStatus === 'active') return website.status === 'Active';
    if (filterStatus === 'inactive') return website.status === 'Inactive';
    if (filterStatus === 'disabled') return website.status === 'Disabled';
    return true;
  }) || [];

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format domain for display (remove protocol)
  const formatDomain = (domain: string) => {
    return domain.replace(/^https?:\/\//, '');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            {t('subtitle')}
          </p>
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
            <button
              onClick={() => setQuickRange(180)}
              className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              {t('dateRange.last6Months')}
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
          <p className="text-red-600 text-sm mt-1">{t('errors.tryAgain')}</p>
        </div>
      )}

      {/* Data Display */}
      {!loading && !error && data && (
        <div data-export-content>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">{t('summary.totalWebsites')}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                    {data.summary.total_websites}
                  </p>
                </div>
                <Globe className="w-8 h-8 text-blue-500 opacity-80" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">{t('summary.active7d')}</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">
                    {data.summary.active_websites}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-green-500 opacity-80" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">{t('summary.totalSessions')}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                    {data.summary.total_sessions.toLocaleString()}
                  </p>
                </div>
                <Users className="w-8 h-8 text-purple-500 opacity-80" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs sm:text-sm text-gray-600">{t('summary.uniqueVisitors')}</p>
                    <div className="group relative flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowTooltip(!showTooltip)}
                        className="focus:outline-none"
                        aria-label={t('summary.validDomainsOnly')}
                      >
                        <Info className="w-3.5 h-3.5 text-amber-500 cursor-help" />
                      </button>
                      <div className={`absolute left-0 sm:left-auto sm:right-0 bottom-full mb-2 ${showTooltip ? 'block' : 'hidden'} lg:group-hover:block z-10 w-56 sm:w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg pointer-events-auto`}>
                        <div className="flex items-start gap-1.5">
                          <span>ℹ️</span>
                          <div>
                            <div className="font-medium mb-0.5">{t('summary.validDomainsOnly')}</div>
                            <div className="text-gray-300">
                              {t('summary.validDomainsTooltip')}
                            </div>
                          </div>
                        </div>
                        <div className="absolute left-2 sm:left-auto sm:right-2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                    {data.summary.total_visitors.toLocaleString()}
                  </p>
                </div>
                <Users className="w-8 h-8 text-indigo-500 opacity-80" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">{t('summary.pageviews')}</p>
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
                  <p className="text-xs sm:text-sm text-gray-600">{t('summary.conversions')}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                    {data.summary.total_conversions.toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-500 opacity-80" />
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="bg-white border border-gray-200 rounded-t-lg overflow-hidden">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setFilterStatus('all')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${filterStatus === 'all'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                {t('filters.allWebsites')} ({data.websites.length})
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${filterStatus === 'active'
                  ? 'bg-green-50 text-green-700 border-b-2 border-green-500'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                {t('filters.active')} ({data.summary.active_websites})
              </button>
              <button
                onClick={() => setFilterStatus('inactive')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${filterStatus === 'inactive'
                  ? 'bg-gray-50 text-gray-700 border-b-2 border-gray-500'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                {t('filters.inactive')} ({data.summary.inactive_websites})
              </button>
              <button
                onClick={() => setFilterStatus('disabled')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${filterStatus === 'disabled'
                  ? 'bg-red-50 text-red-700 border-b-2 border-red-500'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                {t('filters.disabled')} ({data.summary.disabled_websites})
              </button>
            </div>
          </div>

          {/* Empty State */}
          {filteredWebsites.length === 0 && (
            <div className="bg-white rounded-b-lg shadow-sm border border-t-0 border-gray-200 p-8 sm:p-12 text-center">
              <Globe className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">{t('empty.noWebsites')}</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                {filterStatus !== 'all'
                  ? t('empty.hintFiltered', { status: t(`status.${filterStatus}`) })
                  : t('empty.hint')}
              </p>
            </div>
          )}

          {/* Websites Table - Desktop */}
          {filteredWebsites.length > 0 && (
            <div className="hidden lg:block bg-white rounded-b-lg shadow-sm border border-t-0 border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.website')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.sessions')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.visitors')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.pageviews')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.conversions')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.firstSeen')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.lastSeen')}
                      </th>
                      {canManageWebsites && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('table.actions')}
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredWebsites.map((website, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <Globe className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                            <div className="text-sm font-medium text-blue-600 break-all">
                              {formatDomain(website.domain)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {website.status === 'Disabled' ? (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              <Ban className="w-3 h-3 mr-1" />
                              {t('status.disabled')}
                            </span>
                          ) : website.status === 'Active' ? (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              <Activity className="w-3 h-3 mr-1" />
                              {t('status.active')}
                            </span>
                          ) : (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              {t('status.inactive')}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {website.total_sessions.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {website.unique_visitors.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {website.total_pageviews.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                          {website.total_conversions}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(website.first_seen)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(website.last_seen)}
                        </td>
                        {canManageWebsites && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <ProtectedComponent permission="settings:update" hideOnUnauthorized>
                              <button
                                onClick={() => handleToggleStatus(website.domain, website.is_enabled)}
                                disabled={togglingDomain === website.domain}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${website.is_enabled
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {togglingDomain === website.domain ? (
                                  <>
                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    {t('table.processing')}
                                  </>
                                ) : website.is_enabled ? (
                                  <>
                                    <Ban className="w-3 h-3" />
                                    {t('table.disable')}
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-3 h-3" />
                                    {t('table.enable')}
                                  </>
                                )}
                              </button>
                            </ProtectedComponent>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Websites Cards - Mobile/Tablet */}
          {filteredWebsites.length > 0 && (
            <div className="lg:hidden bg-white rounded-b-lg shadow-sm border border-t-0 border-gray-200 divide-y divide-gray-200">
              {filteredWebsites.map((website, idx) => (
                <div key={idx} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start flex-1 min-w-0">
                      <Globe className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-blue-600 break-all mb-1">
                          {formatDomain(website.domain)}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>First: {formatDate(website.first_seen)}</span>
                          <span>•</span>
                          <span>Last: {formatDate(website.last_seen)}</span>
                        </div>
                      </div>
                    </div>
                    {website.status === 'Disabled' ? (
                      <span className="px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 ml-2 flex-shrink-0">
                        <Ban className="w-3 h-3 mr-1" />
                        {t('status.disabled')}
                      </span>
                    ) : website.status === 'Active' ? (
                      <span className="px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 ml-2 flex-shrink-0">
                        <Activity className="w-3 h-3 mr-1" />
                        {t('status.active')}
                      </span>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 ml-2 flex-shrink-0">
                        {t('status.inactive')}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <span className="text-gray-500 text-xs">{t('table.sessions')}</span>
                      <p className="font-medium text-gray-900">{website.total_sessions.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">{t('table.visitors')}</span>
                      <p className="font-medium text-gray-900">{website.unique_visitors.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">{t('table.pageviews')}</span>
                      <p className="font-medium text-gray-900">{website.total_pageviews.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">{t('table.conversions')}</span>
                      <p className="font-medium text-orange-600">{website.total_conversions}</p>
                    </div>
                  </div>
                  <ProtectedComponent permission="settings:update" hideOnUnauthorized>
                    <button
                      onClick={() => handleToggleStatus(website.domain, website.is_enabled)}
                      disabled={togglingDomain === website.domain}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${website.is_enabled
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {togglingDomain === website.domain ? (
                        <>
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          {t('table.processing')}
                        </>
                      ) : website.is_enabled ? (
                        <>
                          <Ban className="w-3 h-3" />
                          {t('table.disableTracking')}
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          {t('table.enableTracking')}
                        </>
                      )}
                    </button>
                  </ProtectedComponent>
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

export default function TrackedWebsitesPage() {
  return (
    <ProtectedRoute permission="users:read" showAccessDeniedMessage={true}>
      <TrackedWebsitesPageContent />
    </ProtectedRoute>
  );
}

