"use client";

import { useState, useEffect } from 'react';
import { Calendar, Globe, Activity, Users, Eye, TrendingUp, Ban, CheckCircle } from 'lucide-react';
import { PageFooter } from '@/components/page-footer';
import { ExportToPDFButton } from '@/components/export-to-pdf-button';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

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

export default function TrackedWebsitesPage() {
  const [dateRange, setDateRange] = useState({
    start: (() => {
      const date = new Date();
      date.setDate(date.getDate() - 90);
      return date.toISOString().split('T')[0];
    })(),
    end: new Date().toISOString().split('T')[0]
  });

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'disabled'>('all');
  const [togglingDomain, setTogglingDomain] = useState<string | null>(null);

  // Toggle website status
  const handleToggleStatus = async (domain: string, currentStatus: boolean) => {
    const action = currentStatus ? 'disable' : 'enable';
    const actionText = currentStatus ? 'Disable' : 'Enable';
    
    const result = await Swal.fire({
      title: `${actionText} Tracking?`,
      text: currentStatus
        ? `Are you sure you want to disable tracking for ${domain}? New tracking requests from this domain will be blocked, but historical data will remain intact.`
        : `Enable tracking for ${domain}? This domain will be able to send tracking data again.`,
      icon: currentStatus ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonColor: currentStatus ? '#ef4444' : '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${actionText} it!`,
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    setTogglingDomain(domain);

    const promise = (async () => {
      const response = await fetch('/api/tracked-websites/toggle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
        loading: `${actionText}ing tracking...`,
        success: currentStatus 
          ? `Tracking disabled for ${domain}`
          : `Tracking enabled for ${domain}`,
        error: (err) => `Failed to ${action}: ${err.message}`,
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
      const response = await fetch(`/api/analytics/tracked-websites?${params}`);
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tracked Websites</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Websites using CosMos AI tracking script
          </p>
        </div>
        <ExportToPDFButton
          element="[data-export-content]"
          filename={`tracked-websites-${dateRange.start}-to-${dateRange.end}.pdf`}
          title={`Tracked Websites - ${dateRange.start} to ${dateRange.end}`}
          size="sm"
        />
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
              Last 30 Days
            </button>
            <button
              onClick={() => setQuickRange(90)}
              className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              Last 3 Months
            </button>
            <button
              onClick={() => setQuickRange(180)}
              className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              Last 6 Months
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
          <p className="text-red-800">Error: {error}</p>
          <p className="text-red-600 text-sm mt-1">Please try again or check your data connection.</p>
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
                  <p className="text-xs sm:text-sm text-gray-600">Total Websites</p>
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
                  <p className="text-xs sm:text-sm text-gray-600">Active (7d)</p>
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
                  <p className="text-xs sm:text-sm text-gray-600">Total Sessions</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                    {data.summary.total_sessions.toLocaleString()}
                  </p>
                </div>
                <Users className="w-8 h-8 text-purple-500 opacity-80" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Unique Visitors</p>
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
                  <p className="text-xs sm:text-sm text-gray-600">Pageviews</p>
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
                  <p className="text-xs sm:text-sm text-gray-600">Conversions</p>
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
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                All Websites ({data.websites.length})
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  filterStatus === 'active'
                    ? 'bg-green-50 text-green-700 border-b-2 border-green-500'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Active ({data.summary.active_websites})
              </button>
              <button
                onClick={() => setFilterStatus('inactive')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  filterStatus === 'inactive'
                    ? 'bg-gray-50 text-gray-700 border-b-2 border-gray-500'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Inactive ({data.summary.inactive_websites})
              </button>
              <button
                onClick={() => setFilterStatus('disabled')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  filterStatus === 'disabled'
                    ? 'bg-red-50 text-red-700 border-b-2 border-red-500'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Disabled ({data.summary.disabled_websites})
              </button>
            </div>
          </div>

          {/* Empty State */}
          {filteredWebsites.length === 0 && (
            <div className="bg-white rounded-b-lg shadow-sm border border-t-0 border-gray-200 p-8 sm:p-12 text-center">
              <Globe className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No websites found</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                {filterStatus !== 'all' 
                  ? `No ${filterStatus} websites in this period`
                  : 'Add the tracking script to websites to see them here'}
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
                        Website
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sessions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Visitors
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pageviews
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Conversions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        First Seen
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Seen
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
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
                              Disabled
                            </span>
                          ) : website.status === 'Active' ? (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              <Activity className="w-3 h-3 mr-1" />
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              Inactive
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleToggleStatus(website.domain, website.is_enabled)}
                            disabled={togglingDomain === website.domain}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                              website.is_enabled
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {togglingDomain === website.domain ? (
                              <>
                                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ...
                              </>
                            ) : website.is_enabled ? (
                              <>
                                <Ban className="w-3 h-3" />
                                Disable
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                Enable
                              </>
                            )}
                          </button>
                        </td>
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
                        Disabled
                      </span>
                    ) : website.status === 'Active' ? (
                      <span className="px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 ml-2 flex-shrink-0">
                        <Activity className="w-3 h-3 mr-1" />
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 ml-2 flex-shrink-0">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <span className="text-gray-500 text-xs">Sessions</span>
                      <p className="font-medium text-gray-900">{website.total_sessions.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Visitors</span>
                      <p className="font-medium text-gray-900">{website.unique_visitors.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Pageviews</span>
                      <p className="font-medium text-gray-900">{website.total_pageviews.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Conversions</span>
                      <p className="font-medium text-orange-600">{website.total_conversions}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleStatus(website.domain, website.is_enabled)}
                    disabled={togglingDomain === website.domain}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                      website.is_enabled
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {togglingDomain === website.domain ? (
                      <>
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : website.is_enabled ? (
                      <>
                        <Ban className="w-3 h-3" />
                        Disable Tracking
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        Enable Tracking
                      </>
                    )}
                  </button>
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

