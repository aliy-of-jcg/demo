"use client";

import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { PageFooter } from '@/components/page-footer';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTranslations } from 'next-intl';

interface HourlyData {
  hour: number;
  visitors: number;
  pageviews: number;
  conversions: number;
  conversionRate: string;
}

interface DayOfWeekData {
  day: string;
  dayOfWeek: number;
  visitors: number;
  pageviews: number;
  conversions: number;
  conversionRate: string;
}

interface DailyTrendData {
  date: string;
  visitors: number;
  pageviews: number;
  conversions: number;
  conversionRate: string;
}

interface ApiResponse {
  success: boolean;
  hourly: HourlyData[];
  dayOfWeek: DayOfWeekData[];
  dailyTrend: DailyTrendData[];
  insights: {
    peakHours: Array<{ hour: number; hourLabel: string; visitors: number }>;
    peakDays: Array<{ day: string; visitors: number }>;
  };
}

export default function TimeAnalysisPage() {
  const t = useTranslations('timeAnalysis');
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
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          start_date: dateRange.start,
          end_date: dateRange.end
        });
        const response = await fetch(`/api/analytics/time-analysis?${params}`);
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch data');
        }
        
        setData(result);
      } catch (err) {
        console.error('Error fetching time analysis data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('title')}</h1>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs sm:text-sm font-medium rounded-full inline-block w-fit">
            {t('timezone')}
          </span>
        </div>
        <p className="text-sm sm:text-base text-gray-600 mt-1">{t('subtitle')}</p>
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
        <>
          {/* Insights Cards */}
          {data.insights && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-6 rounded-lg border border-blue-200">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">{t('insights.peakHours')}</h3>
                <div className="space-y-2">
                  {data.insights.peakHours.map((peak, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm font-medium text-gray-700">{peak.hourLabel}</span>
                      <span className="text-xs sm:text-sm font-bold text-blue-600">{peak.visitors} {t('insights.visitors')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 sm:p-6 rounded-lg border border-green-200">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">{t('insights.peakDays')}</h3>
                <div className="space-y-2">
                  {data.insights.peakDays.map((peak, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm font-medium text-gray-700">{peak.day}</span>
                      <span className="text-xs sm:text-sm font-bold text-green-600">{peak.visitors} {t('insights.visitors')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Hourly Trend */}
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
              {t('charts.hourlyTrend')} <span className="text-xs sm:text-sm font-normal text-gray-500">({t('timezone')})</span>
            </h2>
            {data.hourly.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.hourly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="hour" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(hour) => `${hour.toString().padStart(2, '0')}:00`}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    labelFormatter={(hour) => `Hour: ${hour.toString().padStart(2, '0')}:00 ${t('timezone')}`}
                    contentStyle={{ fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="visitors" fill="#3b82f6" name={t('charts.visitors')} />
                  <Bar dataKey="conversions" fill="#10b981" name={t('charts.conversions')} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500 py-12 text-sm">{t('empty.noHourlyData')}</p>
            )}
          </div>

          {/* Day of Week Trend */}
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{t('charts.dayOfWeekTrend')}</h2>
            {data.dayOfWeek.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.dayOfWeek}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="visitors" fill="#8b5cf6" name={t('charts.visitors')} />
                  <Bar dataKey="conversions" fill="#f59e0b" name={t('charts.conversions')} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500 py-12 text-sm">{t('empty.noDayOfWeekData')}</p>
            )}
          </div>

          {/* Daily Trend over Period */}
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
                  <Line type="monotone" dataKey="visitors" stroke="#3b82f6" strokeWidth={2} name={t('charts.visitors')} />
                  <Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} name={t('charts.conversions')} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Hourly Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
            <div className="p-3 sm:p-4 border-b border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                {t('tables.hourlyDetails')} <span className="text-xs sm:text-sm font-normal text-gray-500">({t('timezone')})</span>
              </h2>
            </div>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tables.hour')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tables.visitors')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tables.pageviews')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tables.conversions')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tables.convRate')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.hourly.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">{t('empty.noHourlyData')}</td>
                    </tr>
                  ) : (
                    data.hourly.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{row.hour.toString().padStart(2, '0')}:00</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{row.visitors.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{row.pageviews.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-green-600 font-medium">{row.conversions}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{row.conversionRate}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Mobile/Tablet Card View */}
            <div className="lg:hidden divide-y divide-gray-200">
              {data.hourly.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">No data available</div>
              ) : (
                data.hourly.map((row, idx) => (
                  <div key={idx} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-900">{row.hour.toString().padStart(2, '0')}:00 KST</span>
                      <span className="text-sm font-medium text-green-600">{row.conversions} conversions</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500 text-xs">Visitors</span>
                        <p className="font-medium text-gray-900">{row.visitors.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">Pageviews</span>
                        <p className="font-medium text-gray-900">{row.pageviews.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">Conv. Rate</span>
                        <p className="font-medium text-gray-900">{row.conversionRate}%</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Day of Week Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
            <div className="p-3 sm:p-4 border-b border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">{t('tables.dayOfWeekDetails')}</h2>
            </div>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tables.day')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tables.visitors')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tables.pageviews')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tables.conversions')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tables.convRate')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.dayOfWeek.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">{t('empty.noDayOfWeekData')}</td>
                    </tr>
                  ) : (
                    data.dayOfWeek.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.day}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{row.visitors.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{row.pageviews.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-green-600 font-medium">{row.conversions}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{row.conversionRate}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Mobile/Tablet Card View */}
            <div className="lg:hidden divide-y divide-gray-200">
              {data.dayOfWeek.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">{t('empty.noDayOfWeekData')}</div>
              ) : (
                data.dayOfWeek.map((row, idx) => (
                  <div key={idx} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-900">{row.day}</span>
                      <span className="text-sm font-medium text-green-600">{row.conversions} {t('tables.conversionsLabel')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500 text-xs">{t('tables.visitors')}</span>
                        <p className="font-medium text-gray-900">{row.visitors.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">{t('tables.pageviews')}</span>
                        <p className="font-medium text-gray-900">{row.pageviews.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">{t('tables.convRate')}</span>
                        <p className="font-medium text-gray-900">{row.conversionRate}%</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Empty State */}
          {data.hourly.length === 0 && data.dayOfWeek.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No time-based data available</p>
              <p className="text-sm text-gray-400 mt-1">Data will appear as visitors use your site</p>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div className="mt-8">
        <PageFooter />
      </div>
    </div>
  );
}
