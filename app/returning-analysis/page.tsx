"use client";

import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { PageFooter } from '@/components/page-footer';
import { ExportToPDFButton } from '@/components/export-to-pdf-button';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTranslations } from 'next-intl';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';
import { useSystemSettings } from '@/lib/contexts/SystemSettingsContext';
import { TrackingStatusBadge } from '@/components/tracking-status-badge';

interface NewVsReturningData {
  new: {
    visitors: number;
    pageviews: number;
    conversions: number;
    conversionRate: string;
    avgTimeOnPage: number;
    percentage: string;
  };
  returning: {
    visitors: number;
    pageviews: number;
    conversions: number;
    conversionRate: string;
    avgTimeOnPage: number;
    percentage: string;
  };
}

interface FrequencyBucket {
  label: string;
  users: number;
}

interface DailyTrendData {
  date: string;
  newVisitors: number;
  returningVisitors: number;
}

interface ApiResponse {
  success: boolean;
  newVsReturning: NewVsReturningData;
  visitFrequency: FrequencyBucket[];
  returnIntervals: FrequencyBucket[];
  insights: {
    avgReturnInterval: number;
    totalReturningUsers: number;
  };
  dailyTrend: DailyTrendData[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ReturningAnalysisPage() {
  const t = useTranslations('returningAnalysis');
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
        const response = await fetchWithAuth(`/api/analytics/returning-analysis?${params}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch data');
        }

        setData(result);
      } catch (err) {
        console.error('Error fetching returning visitor analysis data:', err);
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
          {/* Insights Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-6 rounded-lg border border-blue-200">
              <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">{t('insights.newVisitors')}</h3>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600">{data.newVsReturning.new.visitors.toLocaleString()}</p>
              <p className="text-xs text-gray-600 mt-1">{data.newVsReturning.new.percentage}{t('insights.ofTotal')}</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 sm:p-6 rounded-lg border border-green-200">
              <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">{t('insights.returningVisitors')}</h3>
              <p className="text-2xl sm:text-3xl font-bold text-green-600">{data.newVsReturning.returning.visitors.toLocaleString()}</p>
              <p className="text-xs text-gray-600 mt-1">{data.newVsReturning.returning.percentage}{t('insights.ofTotal')}</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 sm:p-6 rounded-lg border border-orange-200">
              <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">{t('insights.avgReturnInterval')}</h3>
              <p className="text-2xl sm:text-3xl font-bold text-orange-600">{data.insights.avgReturnInterval}</p>
              <p className="text-xs text-gray-600 mt-1">{t('insights.daysBetweenVisits')}</p>
            </div>
          </div>

          {/* New vs Returning Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{t('charts.visitorDistribution')}</h2>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {/* Pie Chart */}
                <div className="w-full sm:w-auto">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: t('metrics.new'), value: data.newVsReturning.new.visitors },
                          { name: t('metrics.returning'), value: data.newVsReturning.returning.visitors }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={false}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#3b82f6" />
                        <Cell fill="#10b981" />
                      </Pie>
                      <Tooltip
                        formatter={(value: any, name: string) => [
                          `${value.toLocaleString()} ${t('table.visitors').toLowerCase()}`,
                          name === t('metrics.new') ? t('insights.newVisitors') : t('insights.returningVisitors')
                        ]}
                        contentStyle={{ fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="flex flex-row sm:flex-col gap-3 sm:gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-700">{t('insights.newVisitors')}</p>
                      <p className="text-sm sm:text-base font-bold text-blue-600">
                        {data.newVsReturning.new.visitors.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">{data.newVsReturning.new.percentage}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-700">{t('charts.returning')}</p>
                      <p className="text-sm sm:text-base font-bold text-green-600">
                        {data.newVsReturning.returning.visitors.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">{data.newVsReturning.returning.percentage}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">{t('charts.comparisonMetrics')}</h2>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs sm:text-sm text-gray-600">{t('metrics.conversionRate')}</span>
                  </div>
                  <div className="flex gap-2 sm:gap-4">
                    <div className="flex-1 bg-blue-100 p-2 sm:p-3 rounded">
                      <p className="text-xs text-gray-600">{t('metrics.new')}</p>
                      <p className="text-base sm:text-lg font-bold text-blue-600">{data.newVsReturning.new.conversionRate}%</p>
                    </div>
                    <div className="flex-1 bg-green-100 p-2 sm:p-3 rounded">
                      <p className="text-xs text-gray-600">{t('metrics.returning')}</p>
                      <p className="text-base sm:text-lg font-bold text-green-600">{data.newVsReturning.returning.conversionRate}%</p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs sm:text-sm text-gray-600">{t('metrics.avgTimeOnPage')}</span>
                  </div>
                  <div className="flex gap-2 sm:gap-4">
                    <div className="flex-1 bg-blue-100 p-2 sm:p-3 rounded">
                      <p className="text-xs text-gray-600">{t('metrics.new')}</p>
                      <p className="text-base sm:text-lg font-bold text-blue-600">{data.newVsReturning.new.avgTimeOnPage}s</p>
                    </div>
                    <div className="flex-1 bg-green-100 p-2 sm:p-3 rounded">
                      <p className="text-xs text-gray-600">{t('metrics.returning')}</p>
                      <p className="text-base sm:text-lg font-bold text-green-600">{data.newVsReturning.returning.avgTimeOnPage}s</p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs sm:text-sm text-gray-600">{t('metrics.pageviews')}</span>
                  </div>
                  <div className="flex gap-2 sm:gap-4">
                    <div className="flex-1 bg-blue-100 p-2 sm:p-3 rounded">
                      <p className="text-xs text-gray-600">{t('metrics.new')}</p>
                      <p className="text-base sm:text-lg font-bold text-blue-600">{data.newVsReturning.new.pageviews.toLocaleString()}</p>
                    </div>
                    <div className="flex-1 bg-green-100 p-2 sm:p-3 rounded">
                      <p className="text-xs text-gray-600">{t('metrics.returning')}</p>
                      <p className="text-base sm:text-lg font-bold text-green-600">{data.newVsReturning.returning.pageviews.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Visit Frequency */}
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{t('charts.visitFrequency')}</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.visitFrequency}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: '12px' }} />
                <Bar dataKey="users" fill="#8b5cf6" name={t('charts.users')} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Return Intervals */}
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{t('charts.returnIntervals')}</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.returnIntervals}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: '12px' }} />
                <Bar dataKey="users" fill="#f59e0b" name={t('charts.users')} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Daily Trend */}
          {data.dailyTrend.length > 0 && (
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{t('charts.dailyTrend')}</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="newVisitors" stroke="#3b82f6" strokeWidth={2} name={t('charts.newVisitors')} />
                  <Line type="monotone" dataKey="returningVisitors" stroke="#10b981" strokeWidth={2} name={t('insights.returningVisitors')} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Detailed Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{t('table.title')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.metric')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.newVisitors')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.returningVisitors')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{t('table.visitors')}</td>
                    <td className="px-6 py-4 text-sm text-blue-600">{data.newVsReturning.new.visitors.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-green-600">{data.newVsReturning.returning.visitors.toLocaleString()}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{t('table.pageviews')}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{data.newVsReturning.new.pageviews.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{data.newVsReturning.returning.pageviews.toLocaleString()}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{t('table.conversions')}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{data.newVsReturning.new.conversions}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{data.newVsReturning.returning.conversions}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{t('table.conversionRate')}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{data.newVsReturning.new.conversionRate}%</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{data.newVsReturning.returning.conversionRate}%</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{t('table.avgTimeOnPage')}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{data.newVsReturning.new.avgTimeOnPage}s</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{data.newVsReturning.returning.avgTimeOnPage}s</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Empty State */}
          {data.newVsReturning.new.visitors === 0 && data.newVsReturning.returning.visitors === 0 && (
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
