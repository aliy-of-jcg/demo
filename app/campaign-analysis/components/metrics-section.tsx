'use client';

import { useTranslations } from 'next-intl';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CampaignData {
  id: number;
  name: string;
  course_name: string;
  budget: number;
  spent: number;
}

interface MetricsData {
  visitors: number;
  conversions: number;
  conversionRate: string;
  clicks: number;
  ctr: string;
  revenue: number;
  cpa: number;
}

interface DailyData {
  date: string;
  visitors: number;
  conversions: number;
  conversionRate: string;
  cost: number;
}

interface CampaignMetricsResponse {
  campaign: CampaignData;
  platforms: string[];
  metrics: MetricsData;
  dailyData: DailyData[];
  hasLegacyData: boolean;
  clicksFromLegacyData: number;
  deletedLinksCount: number;
}

interface MetricsSectionProps {
  metricsData: CampaignMetricsResponse | null;
  loading: boolean;
  error: string | null;
  viewMode: 'chart' | 'table' | 'utm';
}

export function MetricsSection({
  metricsData: data,
  loading,
  error,
  viewMode,
}: MetricsSectionProps) {
  const t = useTranslations('campaignAnalysis');

  if (loading) {
    return (
      <>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-gray-100 p-3 sm:p-4 rounded-lg border border-gray-200 animate-pulse">
              <div className="h-4 bg-gray-300 rounded w-16 mb-2"></div>
              <div className="h-8 bg-gray-300 rounded w-12"></div>
            </div>
          ))}
        </div>
        {viewMode === 'chart' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="bg-gray-100 p-4 sm:p-6 rounded-lg border border-gray-200 animate-pulse">
              <div className="h-6 bg-gray-300 rounded w-32 mb-4"></div>
              <div className="h-48 bg-gray-300 rounded"></div>
            </div>
            <div className="bg-gray-100 p-4 sm:p-6 rounded-lg border border-gray-200 animate-pulse">
              <div className="h-6 bg-gray-300 rounded w-32 mb-4"></div>
              <div className="h-48 bg-gray-300 rounded"></div>
            </div>
          </div>
        )}
        {viewMode === 'table' && (
          <div className="bg-gray-100 p-4 sm:p-6 rounded-lg border border-gray-200 mb-4 sm:mb-6 animate-pulse">
            <div className="h-6 bg-gray-300 rounded w-32 mb-4"></div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-gray-300 rounded"></div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 sm:mb-6">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const displayMetrics = data.metrics;

  return (
    <>
      {/* Metric Cards - 6 columns */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6">
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-100 rounded flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p className="text-xs text-gray-600">{t('metrics.visitors')}</p>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{displayMetrics.visitors.toLocaleString()}</p>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs text-gray-600">{t('metrics.conversions')}</p>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{displayMetrics.conversions}</p>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-pink-100 rounded flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-xs text-gray-600">{t('metrics.convRate')}</p>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{displayMetrics.conversionRate}%</p>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-100 rounded flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs text-gray-600">{t('metrics.budget')}</p>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">₩{(data.campaign.budget / 10000).toFixed(0)}만</p>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-100 rounded flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-xs text-gray-600">{t('metrics.spend')}</p>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">₩{(data.campaign.spent / 10000).toFixed(0)}만</p>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            </div>
            <p className="text-xs text-gray-600">{t('metrics.ctr')}</p>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{displayMetrics.ctr}%</p>
        </div>
      </div>

      {/* Chart View */}
      {viewMode === 'chart' && (
        <>
          {data.dailyData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
              {/* Daily Visitors Chart */}
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900">{t('charts.dailyVisitors')}</h3>
                  <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-0.5 sm:w-3 sm:h-0.5 bg-blue-500"></div>
                      <span className="text-gray-600">{t('charts.visitors')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-0.5 sm:w-3 sm:h-0.5 bg-green-500"></div>
                      <span className="text-gray-600">{t('charts.conversions')}</span>
                    </div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 9, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '11px'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="visitors"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="conversions"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: '#10b981', r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Daily Cost Chart */}
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900">{t('charts.dailyCost')}</h3>
                  <div className="flex items-center gap-1 text-xs sm:text-sm">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-orange-500 rounded"></div>
                    <span className="text-gray-600">{t('charts.cost')}</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 9, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '11px'
                      }}
                      formatter={(value: number) => [`₩${(value / 10000).toFixed(0)}만`, 'Cost']}
                    />
                    <Bar
                      dataKey="cost"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center mb-4 sm:mb-6">
              <p className="text-gray-500">{t('empty.noData')}</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">{t('empty.hint')}</p>
            </div>
          )}
        </>
      )}

      {/* Daily Performance Table */}
      {viewMode === 'table' && (
        <>
          {data.dailyData.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
              <div className="p-3 sm:p-4 border-b border-gray-200">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900">{t('table.title')}</h3>
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.date')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.visitors')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.conversions')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.convRate')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.cost')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.ctr')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.avgCPC')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.dailyData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.visitors.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">{row.conversions}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.conversionRate}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₩{(row.cost / 10000).toFixed(1)}만</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {data.metrics.ctr}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          ₩{row.visitors > 0 ? ((row.cost / row.visitors) / 10).toFixed(0) : 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className="lg:hidden divide-y divide-gray-200">
                {data.dailyData.map((row, idx) => (
                  <div key={idx} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-900">{row.date}</span>
                      <span className="text-sm font-medium text-green-600">{row.conversions} {t('table.conversionsLabel')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500 text-xs">{t('mobile.visitors')}</span>
                        <p className="font-medium text-gray-900">{row.visitors.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">{t('mobile.convRate')}</span>
                        <p className="font-medium text-gray-900">{row.conversionRate}%</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">{t('mobile.cost')}</span>
                        <p className="font-medium text-gray-900">₩{(row.cost / 10000).toFixed(1)}만</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">{t('mobile.avgCPC')}</span>
                        <p className="font-medium text-gray-900">₩{row.visitors > 0 ? ((row.cost / row.visitors) / 10).toFixed(0) : 0}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center mb-4 sm:mb-6">
              <p className="text-gray-500">{t('empty.noData')}</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">{t('empty.hint')}</p>
            </div>
          )}
        </>
      )}
    </>
  );
}

