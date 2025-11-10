"use client";

import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { PageFooter } from '@/components/page-footer';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          start: dateRange.start,
          end: dateRange.end
        });
        const response = await fetch(`/api/analytics/channel-performance?${params}`);
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
  }, [dateRange]);

  // Color mapping for different channels
  const getChannelColor = (channel: string) => {
    const colorMap: Record<string, { bg: string; text: string; border: string }> = {
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
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Channel Performance</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Detailed analysis of campaign performance by media channel</p>
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
              Last 7 Days
            </button>
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
        <>
          {/* Chart Section - Channel Comparison */}
          {data.chartData && data.chartData.length > 0 && (
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-4">Channel Performance Comparison</h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">Compare visits, conversions, and ad cost across channels</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      if (name === 'adCost') return [formatCurrency(value), 'Ad Cost'];
                      return [value, name];
                    }}
                    contentStyle={{ fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar yAxisId="left" dataKey="visits" fill="#3b82f6" name="Visits" />
                  <Bar yAxisId="left" dataKey="conversions" fill="#f59e0b" name="Conversions" />
                  <Bar yAxisId="right" dataKey="adCost" fill="#10b981" name="Ad Cost (₩)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Empty State */}
          {data.channels.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
              <p className="text-gray-500">No channel data available for this period</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">Create campaigns to see channel performance</p>
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
                          {visibleCampaigns.length} campaign{visibleCampaigns.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 text-left lg:text-right">
                        <div>
                          <p className="text-xs text-gray-600">Total Visits</p>
                          <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">{channelData.total_visits.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Total Conversions</p>
                          <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">{channelData.total_conversions}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Total Ad Cost</p>
                          <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">{formatCurrency(channelData.total_ad_cost)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Avg CTR</p>
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
                            Campaign
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ad Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Visits
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Conversions
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Conv. Rate
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ad Cost
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            CTR
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
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
                            Channel Total
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
                              <span className="text-gray-500 text-xs">Visits</span>
                              <p className="font-medium text-gray-900">{campaign.visits.toLocaleString()}</p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">Conversions</span>
                              <p className="font-medium text-gray-900">{campaign.conversions}</p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">Conv. Rate</span>
                              <p className="font-medium text-green-600">{campaign.conversion_rate}%</p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">CTR</span>
                              <p className="font-medium text-blue-600">{campaign.ctr}%</p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs">Ad Cost</span>
                              <p className="font-medium text-gray-900">{formatCurrency(campaign.ad_cost)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Mobile Totals Card */}
                    <div className="bg-gray-100 p-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Channel Total</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600 text-xs">Visits</span>
                          <p className="font-semibold text-gray-900">{channelData.total_visits.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-gray-600 text-xs">Conversions</span>
                          <p className="font-semibold text-gray-900">{channelData.total_conversions}</p>
                        </div>
                        <div>
                          <span className="text-gray-600 text-xs">Conv. Rate</span>
                          <p className="font-semibold text-green-600">
                            {channelData.total_visits > 0 
                              ? ((channelData.total_conversions / channelData.total_visits) * 100).toFixed(2)
                              : '0.00'}%
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600 text-xs">CTR</span>
                          <p className="font-semibold text-blue-600">{channelData.avg_ctr}%</p>
                        </div>
                        <div>
                          <span className="text-gray-600 text-xs">Ad Cost</span>
                          <p className="font-semibold text-gray-900">{formatCurrency(channelData.total_ad_cost)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </>
      )}

      {/* Footer with extra spacing */}
      <div className="mt-8">
        <PageFooter />
      </div>
    </div>
  );
}

