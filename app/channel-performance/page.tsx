"use client";

import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { PageFooter } from '@/components/page-footer';
import { ExportToPDFButton } from '@/components/export-to-pdf-button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTranslations } from 'next-intl';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';
import { useSystemSettings } from '@/lib/contexts/SystemSettingsContext';
import { TrackingStatusBadge } from '@/components/tracking-status-badge';

interface Campaign {
  campaign_id: number;
  campaign_name: string;
  source: string;
  medium: string;
  status: string;
  visits: number;
  conversions: number;
  conversion_rate: number;
  ad_cost: number;
  clicks: number;
  ctr: number;
}

interface Channel {
  channel: string;
  total_visits: number;
  total_conversions: number;
  total_ad_cost: number;
  avg_ctr: number;
  campaigns: Campaign[];
}

interface ApiResponse {
  success: boolean;
  channels: Channel[];
  chartData: Array<{
    name: string;
    visits: number;
    conversions: number;
    adCost: number;
  }>;
}

export default function ChannelPerformancePage() {
  const t = useTranslations('channelPerformance');
  const { getInitialDateRange, isLoading: settingsLoading } = useSystemSettings();

  // Initialize after system settings load to avoid double-fetch
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  // Update date range when system settings load (GA behavior: apply defaults on page load)
  useEffect(() => {
    if (!settingsLoading) {
      try {
        const initialRange = getInitialDateRange();
        setDateRange(initialRange);
      } catch (err) {
        // If settings fail, keep dateRange null and skip fetch
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

  // Fetch data from API
  useEffect(() => {
    // Wait for system settings to load so we fetch once with the correct defaults
    if (settingsLoading || !dateRange) {
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          start: dateRange.start,
          end: dateRange.end
        });
        const response = await fetchWithAuth(`/api/analytics/channel-performance?${params}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch data');
        }

        setData(result);
      } catch (err) {
        console.error('Error fetching channel performance data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange, settingsLoading]);

  // Color mapping for different channels
  const getChannelColor = (channel: string) => {
    const colorMap: Record<string, { bg: string; text: string; border: string }> = {
      'direct': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
      'naver': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
      'kakao': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
      'google': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      'youtube': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
      'facebook': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
      'instagram': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
      'saramin': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    };
    return colorMap[channel.toLowerCase()] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
  };

  // Status badge styling
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string }> = {
      'active': { bg: 'bg-green-100', text: 'text-green-800' },
      'waiting': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      'paused': { bg: 'bg-orange-100', text: 'text-orange-800' },
      'ended': { bg: 'bg-gray-100', text: 'text-gray-800' },
    };
    return statusMap[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };
  };

  // Format currency (Korean Won)
  const formatCurrency = (amount: number) => {
    if (amount >= 10000) {
      return `₩${(amount / 10000).toFixed(0)}만`;
    }
    return `₩${amount.toLocaleString()}`;
  };

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
          {dateRange && (
            <ExportToPDFButton
              element="[data-export-content]"
              filename={t('export.filename', { start: dateRange.start, end: dateRange.end })}
              title={t('export.title', { start: dateRange.start, end: dateRange.end })}
              size="sm"
            />
          )}
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
              value={dateRange?.start || ''}
              onChange={(e) => {
                if (dateRange) {
                  setDateRange({ ...dateRange, start: e.target.value });
                }
              }}
              className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm flex-1 min-w-[120px]"
            />
            <span className="text-gray-500">~</span>
            <input
              type="date"
              value={dateRange?.end || ''}
              onChange={(e) => {
                if (dateRange) {
                  setDateRange({ ...dateRange, end: e.target.value });
                }
              }}
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
          <p className="text-red-600 text-sm mt-1">{t('errors.tryAgain')}</p>
        </div>
      )}

      {/* Data Display */}
      {!loading && !error && data && (
        <div data-export-content>
          {/* Chart Section - Channel Comparison */}
          {data.chartData && data.chartData.length > 0 && (
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-4">{t('chart.title')}</h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">{t('chart.subtitle')}</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value: any, name: string) => {
                      if (name === 'adCost') return [formatCurrency(value), t('chart.adCost')];
                      return [value, name === 'visits' ? t('chart.visits') : name === 'conversions' ? t('chart.conversions') : name];
                    }}
                    contentStyle={{ fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar yAxisId="left" dataKey="visits" fill="#3b82f6" name={t('chart.visits')} />
                  <Bar yAxisId="left" dataKey="conversions" fill="#f59e0b" name={t('chart.conversions')} />
                  <Bar yAxisId="right" dataKey="adCost" fill="#10b981" name={t('chart.adCost')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Empty State */}
          {data.channels.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
              <p className="text-gray-500">{t('empty.noData')}</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">{t('empty.hint')}</p>
            </div>
          )}

          {/* Channel Sections - Detailed Tables */}
          {data.channels.length > 0 && data.channels.map((channelData, idx) => {
            const colors = getChannelColor(channelData.channel);
            const visibleCampaigns = channelData.campaigns.filter((campaign) => campaign.status !== "hidden");

            return (
              <div key={idx} className={`bg-white rounded-lg shadow-sm border ${colors.border} mb-4 sm:mb-6`}>
                {/* Channel Header */}
                <div className={`p-4 sm:p-6 ${colors.bg} border-b ${colors.border}`}>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                      <h2 className={`text-xl sm:text-2xl font-bold ${colors.text} capitalize`}>
                        {channelData.channel}
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        {visibleCampaigns.length} {visibleCampaigns.length !== 1 ? t('table.campaigns') : t('table.campaign')}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 text-left lg:text-right">
                      <div>
                        <p className="text-xs text-gray-600">{t('metrics.totalVisits')}</p>
                        <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">{channelData.total_visits.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">{t('metrics.totalConversions')}</p>
                        <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">{channelData.total_conversions}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">{t('metrics.totalAdCost')}</p>
                        <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">{formatCurrency(channelData.total_ad_cost)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">{t('metrics.avgCTR')}</p>
                        <p className={`text-base sm:text-lg lg:text-xl font-bold ${colors.text}`}>{channelData.avg_ctr}%</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Campaign Table */}
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('table.campaign')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('table.adType')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('table.visits')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('table.conversions')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('table.convRate')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('table.adCost')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('table.ctr')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('table.status')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {visibleCampaigns.map((campaign, campaignIdx) => {
                        const statusStyle = getStatusBadge(campaign.status);
                        const costPerConversion = campaign.conversions > 0 ? campaign.ad_cost / campaign.conversions : 0;

                        return (
                          <tr key={campaignIdx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{campaign.campaign_name}</div>
                              <div className="text-xs text-gray-500">ID: {campaign.campaign_id}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                              {campaign.medium}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {campaign.visits.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {campaign.conversions}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                              {campaign.conversion_rate}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(campaign.ad_cost)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                              {campaign.ctr}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                                {campaign.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* Channel Totals Row */}
                    <tfoot className="bg-gray-100 font-semibold">
                      <tr>
                        <td colSpan={2} className="px-6 py-4 text-sm text-gray-900">
                          {t('table.channelTotal')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {channelData.total_visits.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {channelData.total_conversions}
                        </td>
                        <td className="px-6 py-4 text-sm text-green-600">
                          {channelData.total_visits > 0
                            ? ((channelData.total_conversions / channelData.total_visits) * 100).toFixed(2)
                            : '0.00'}%
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatCurrency(channelData.total_ad_cost)}
                        </td>
                        <td className="px-6 py-4 text-sm text-blue-600">
                          {channelData.avg_ctr}%
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          -
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile/Tablet Card View */}
                <div className="lg:hidden divide-y divide-gray-200">
                  {visibleCampaigns.map((campaign, campaignIdx) => {
                    const statusStyle = getStatusBadge(campaign.status);

                    return (
                      <div key={campaignIdx} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-gray-900 mb-1">{campaign.campaign_name}</h3>
                            <p className="text-xs text-gray-500">ID: {campaign.campaign_id}</p>
                            <p className="text-xs text-gray-600 capitalize mt-1">Type: {campaign.medium}</p>
                          </div>
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyle.bg} ${statusStyle.text} ml-2`}>
                            {campaign.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500 text-xs">{t('mobile.visits')}</span>
                            <p className="font-medium text-gray-900">{campaign.visits.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">{t('mobile.conversions')}</span>
                            <p className="font-medium text-gray-900">{campaign.conversions}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">{t('mobile.convRate')}</span>
                            <p className="font-medium text-green-600">{campaign.conversion_rate}%</p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">{t('mobile.ctr')}</span>
                            <p className="font-medium text-blue-600">{campaign.ctr}%</p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">{t('mobile.adCost')}</span>
                            <p className="font-medium text-gray-900">{formatCurrency(campaign.ad_cost)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Mobile Totals Card */}
                  <div className="bg-gray-100 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('table.channelTotal')}</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600 text-xs">{t('mobile.visits')}</span>
                        <p className="font-semibold text-gray-900">{channelData.total_visits.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 text-xs">{t('mobile.conversions')}</span>
                        <p className="font-semibold text-gray-900">{channelData.total_conversions}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 text-xs">{t('mobile.convRate')}</span>
                        <p className="font-semibold text-green-600">
                          {channelData.total_visits > 0
                            ? ((channelData.total_conversions / channelData.total_visits) * 100).toFixed(2)
                            : '0.00'}%
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600 text-xs">{t('mobile.ctr')}</span>
                        <p className="font-semibold text-blue-600">{channelData.avg_ctr}%</p>
                      </div>
                      <div>
                        <span className="text-gray-600 text-xs">{t('mobile.adCost')}</span>
                        <p className="font-semibold text-gray-900">{formatCurrency(channelData.total_ad_cost)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer with extra spacing */}
      <div className="mt-8">
        <PageFooter />
      </div>
    </div>
  );
}

