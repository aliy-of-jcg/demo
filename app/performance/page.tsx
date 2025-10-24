"use client";

import { useState, useEffect } from 'react';
import { Calendar, Users, TrendingUp, DollarSign, Target } from 'lucide-react';
import { PageFooter } from '@/components/page-footer';

interface PerformanceData {
  metrics: {
    totalVisitors: number;
    conversions: number;
    conversionRate: string;
    revenue: number;
  };
  channelData: Array<{
    channel: string;
    visitors: number;
    conversions: number;
    rate: string;
    revenue: number;
    cpa: number;
  }>;
  visitorTrend: {
    current: Array<{ date: string; visitors: number }>;
    comparison: Array<{ date: string; visitors: number }>;
  };
}

export default function PerformanceAnalysisPage() {
  const [dateRange, setDateRange] = useState({
    start: (() => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date.toISOString().split('T')[0];
    })(),
    end: new Date().toISOString().split('T')[0]
  });

  const [data, setData] = useState<PerformanceData | null>(null);
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
        const response = await fetch(`/api/analytics/performance?${params}`);
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch data');
        }
        
        setData(result);
      } catch (err) {
        console.error('Error fetching performance data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  // Channel colors mapping
  const getChannelColor = (channel: string) => {
    const colorMap: Record<string, string> = {
      'naver': 'bg-green-500',
      'kakao': 'bg-yellow-500',
      'google': 'bg-red-500',
      'youtube': 'bg-blue-500',
      'facebook': 'bg-indigo-500',
      'instagram': 'bg-pink-500',
      'direct': 'bg-gray-500',
    };
    return colorMap[channel.toLowerCase()] || 'bg-gray-400';
  };

  const channelDataWithColors = data?.channelData.map(item => ({
    ...item,
    color: getChannelColor(item.channel)
  })) || [];

  // Calculate percentages for donut chart
  const totalVisitors = channelDataWithColors.reduce((sum, item) => sum + item.visitors, 0);
  const chartData = channelDataWithColors.map(item => ({
    ...item,
    percentage: totalVisitors > 0 ? ((item.visitors / totalVisitors) * 100).toFixed(1) : '0'
  }));

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Performance Dashboard</h1>
        <p className="text-gray-600 mt-1">Overall marketing campaign performance analysis</p>
      </div>

      {/* Date Range Picker */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Date Range Picker */}
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <span className="text-gray-500">~</span>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {/* Right: Quick Range Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuickRange(7)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Last 7 days
            </button>
            <button
              onClick={() => setQuickRange(30)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Last 30 days
            </button>
            <button
              onClick={() => setQuickRange(90)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Last 3 months
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
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Total Visitors */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-sm text-gray-600">Total Visitors</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{data.metrics.totalVisitors.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Total unique visitors</p>
            </div>

            {/* Conversions */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm text-gray-600">Conversions</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{data.metrics.conversions.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Total conversions</p>
            </div>

            {/* Conversion Rate */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm text-gray-600">Conversion Rate</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{data.metrics.conversionRate}%</p>
              <p className="text-xs text-gray-500 mt-1">Average conversion rate</p>
            </div>

            {/* Revenue */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-sm text-gray-600">Revenue</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                ₩{data.metrics.revenue > 0 ? (data.metrics.revenue / 10000).toFixed(0) + 'M' : '0'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Total revenue</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Visitor Trend Chart - Placeholder for now */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Visitor Trend by Date</h2>
                <span className="text-xs text-gray-500">Period comparison</span>
              </div>
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Chart visualization coming soon</p>
                  <p className="text-xs">{data.visitorTrend.current.length} data points available</p>
                </div>
              </div>
            </div>

            {/* Donut Chart - Channel Distribution */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Visitors by Channel</h2>
                <span className="text-xs text-gray-500">Current period breakdown</span>
              </div>
              <div className="flex items-center justify-center h-64">
                {chartData.length > 0 ? (
                  <div className="w-full">
                    <div className="relative w-48 h-48 mx-auto mb-4">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">{totalVisitors.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">Total</p>
                        </div>
                      </div>
                    </div>
                    {/* Legend */}
                    <div className="grid grid-cols-2 gap-3">
                      {chartData.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className={`w-3 h-3 ${item.color} rounded-sm`}></div>
                          <span className="text-xs text-gray-600">{item.channel}</span>
                          <span className="text-xs font-medium text-gray-900 ml-auto">{item.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400">No channel data available</p>
                )}
              </div>
            </div>
          </div>

          {/* Channel Performance Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Channel Performance Ranking</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Channel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visitors
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conversions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conversion Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CPA
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {channelDataWithColors.length > 0 ? (
                    channelDataWithColors.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 ${item.color} rounded-full`}></div>
                            <span className="text-sm font-medium text-gray-900">{item.channel}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.visitors.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.conversions}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {item.rate}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₩{(item.revenue / 10000).toFixed(2)}M
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₩{item.cpa > 0 ? (item.cpa / 10000).toFixed(0) + '만' : '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        No channel data available for this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Footer with extra spacing */}
      <div className="mt-8">
        <PageFooter />
      </div>
    </div>
  );
}
