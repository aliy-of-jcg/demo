"use client";

import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { PageFooter } from '@/components/page-footer';
import { ExportToPDFButton } from '@/components/export-to-pdf-button';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useTranslations } from 'next-intl';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';
import { useSystemSettings } from '@/lib/contexts/SystemSettingsContext';
import { TrackingStatusBadge } from '@/components/tracking-status-badge';

interface EnvironmentItem {
  device?: string;
  os?: string;
  browser?: string;
  resolution?: string;
  visitors: number;
  pageviews: number;
  conversions?: number;
  conversionRate?: string;
}

interface ApiResponse {
  success: boolean;
  devices: EnvironmentItem[];
  os: EnvironmentItem[];
  browsers: EnvironmentItem[];
  resolutions: EnvironmentItem[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function EnvironmentAnalysisPage() {
  const t = useTranslations('environmentAnalysis');
  const { getInitialDateRange, isLoading: settingsLoading } = useSystemSettings();

  // Initialize date range from system defaults (GA behavior)
  // On page reload, defaults are applied automatically
  const [dateRange, setDateRange] = useState(() => {
    // Fallback to 30 days initially (will be updated when settings load)
    const date = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return {
      start: start.toISOString().split('T')[0],
      end: date.toISOString().split('T')[0]
    };
  });

  // Update date range when system settings load (GA behavior: apply defaults on page load)
  useEffect(() => {
    if (!settingsLoading) {
      try {
        const initialRange = getInitialDateRange();
        setDateRange(initialRange);
      } catch (err) {
        // Fallback handled by useState initializer
      }
    }
  }, [settingsLoading, getInitialDateRange]);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch data
  useEffect(() => {
    // Wait for system settings to load so we fetch once with the correct defaults
    if (settingsLoading) {
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          start_date: dateRange.start,
          end_date: dateRange.end
        });
        const response = await fetchWithAuth(`/api/analytics/environment-analysis?${params}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch data');
        }

        setData(result);
      } catch (err) {
        console.error('Error fetching environment analysis data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange, settingsLoading]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <TrackingStatusBadge />
          <ExportToPDFButton
            element="[data-export-content]"
            filename={t('export.filename', { start: dateRange.start, end: dateRange.end })}
            title={t('export.title', { start: dateRange.start, end: dateRange.end })}
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
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {/* Mobile Card */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs sm:text-sm text-gray-600">{t('summary.mobileUsers')}</p>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                {(() => {
                  const mobile = data.devices.find(d => d.device?.toLowerCase() === 'mobile');
                  const total = data.devices.reduce((sum, d) => sum + d.visitors, 0);
                  const percentage = total > 0 ? ((mobile?.visitors || 0) / total * 100).toFixed(1) : '0.0';
                  return percentage + '%';
                })()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {data.devices.find(d => d.device?.toLowerCase() === 'mobile')?.visitors.toLocaleString() || 0} {t('summary.visitors')}
              </p>
            </div>

            {/* Tablet Card */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs sm:text-sm text-gray-600">{t('summary.tabletUsers')}</p>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                {(() => {
                  const tablet = data.devices.find(d => d.device?.toLowerCase() === 'tablet');
                  const total = data.devices.reduce((sum, d) => sum + d.visitors, 0);
                  const percentage = total > 0 ? ((tablet?.visitors || 0) / total * 100).toFixed(1) : '0.0';
                  return percentage + '%';
                })()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {data.devices.find(d => d.device?.toLowerCase() === 'tablet')?.visitors.toLocaleString() || 0} {t('summary.visitors')}
              </p>
            </div>

            {/* Desktop Card */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs sm:text-sm text-gray-600">{t('summary.desktopUsers')}</p>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                {(() => {
                  const desktop = data.devices.find(d => d.device?.toLowerCase() === 'desktop');
                  const total = data.devices.reduce((sum, d) => sum + d.visitors, 0);
                  const percentage = total > 0 ? ((desktop?.visitors || 0) / total * 100).toFixed(1) : '0.0';
                  return percentage + '%';
                })()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {data.devices.find(d => d.device?.toLowerCase() === 'desktop')?.visitors.toLocaleString() || 0} {t('summary.visitors')}
              </p>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs sm:text-sm text-gray-600">{t('summary.avgConvRate')}</p>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                {(() => {
                  // Calculate weighted average conversion rate based on visitor counts
                  const totalVisitors = data.devices.reduce((sum, item) => sum + item.visitors, 0);
                  const totalConversions = data.devices.reduce((sum, item) => sum + (item.conversions || 0), 0);
                  const avgRate = totalVisitors > 0
                    ? ((totalConversions / totalVisitors) * 100).toFixed(2)
                    : '0.00';
                  return avgRate + '%';
                })()}
              </p>
              <p className="text-xs text-gray-500 mt-1">{t('summary.acrossAllDevices')}</p>
            </div>
          </div>

          {/* Device Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">{t('sections.deviceType')}</h2>
              {data.devices.length > 0 ? (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={data.devices.map(d => ({ name: d.device || 'Unknown', value: d.visitors }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={85}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {data.devices.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Device Legend */}
                  <div className="grid grid-cols-2 gap-2">
                    {data.devices.map((device, idx) => {
                      const total = data.devices.reduce((sum, d) => sum + d.visitors, 0);
                      const percentage = total > 0 ? ((device.visitors / total) * 100).toFixed(0) : '0';
                      return (
                        <div key={idx} className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-3 h-3 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          ></div>
                          <span className="text-xs text-gray-700 truncate flex-1 capitalize">{device.device || 'Unknown'}</span>
                          <span className="text-xs font-medium text-gray-900 flex-shrink-0">{percentage}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-12 text-sm">{t('empty.noDeviceData')}</p>
              )}
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">{t('sections.deviceStatistics')}</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('table.device')}</th>
                      <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('table.visitors')}</th>
                      <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('table.convRate')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.devices.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-4 text-center text-gray-500 text-sm">{t('empty.noDeviceData')}</td>
                      </tr>
                    ) : (
                      data.devices.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900 capitalize">{item.device || 'Unknown'}</td>
                          <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900">{item.visitors.toLocaleString()}</td>
                          <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-green-600">{item.conversionRate}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* OS Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">{t('sections.operatingSystem')}</h2>
              {data.os.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.os}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="os" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="visitors" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500 py-12 text-sm">{t('empty.noOSData')}</p>
              )}
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">{t('sections.osStatistics')}</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('table.os')}</th>
                      <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('table.visitors')}</th>
                      <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('table.convRate')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.os.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-4 text-center text-gray-500 text-sm">{t('empty.noOSData')}</td>
                      </tr>
                    ) : (
                      data.os.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900">{item.os || 'Unknown'}</td>
                          <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900">{item.visitors.toLocaleString()}</td>
                          <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-green-600">{item.conversionRate}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Browser Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">{t('sections.browser')}</h2>
              {data.browsers.length > 0 ? (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={data.browsers.map(b => ({ name: b.browser || 'Unknown', value: b.visitors }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={85}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {data.browsers.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Browser Legend */}
                  <div className="grid grid-cols-2 gap-2">
                    {data.browsers.map((browser, idx) => {
                      const total = data.browsers.reduce((sum, b) => sum + b.visitors, 0);
                      const percentage = total > 0 ? ((browser.visitors / total) * 100).toFixed(0) : '0';
                      return (
                        <div key={idx} className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-3 h-3 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          ></div>
                          <span className="text-xs text-gray-700 truncate flex-1">{browser.browser || 'Unknown'}</span>
                          <span className="text-xs font-medium text-gray-900 flex-shrink-0">{percentage}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-12 text-sm">{t('empty.noBrowserData')}</p>
              )}
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">{t('sections.browserStatistics')}</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('table.browser')}</th>
                      <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('table.visitors')}</th>
                      <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('table.convRate')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.browsers.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-4 text-center text-gray-500 text-sm">{t('empty.noBrowserData')}</td>
                      </tr>
                    ) : (
                      data.browsers.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900">{item.browser || 'Unknown'}</td>
                          <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900">{item.visitors.toLocaleString()}</td>
                          <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-green-600">{item.conversionRate}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Screen Resolution */}
          {data.resolutions.length > 0 && (
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
                    {data.resolutions.map((item, idx) => {
                      const totalVisitors = data.resolutions.reduce((sum, r) => sum + r.visitors, 0);
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
          )}

          {/* Empty State */}
          {data.devices.length === 0 && data.os.length === 0 && data.browsers.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
              <p className="text-gray-500">{t('empty.noData')}</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">{t('empty.hint')}</p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 sm:mt-8">
        <PageFooter />
      </div>
    </div>
  );
}

