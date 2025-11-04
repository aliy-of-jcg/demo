"use client";

import { useState, useEffect } from 'react';
import { Calendar, Users, TrendingUp, DollarSign, Target } from 'lucide-react';
import { PageFooter } from '@/components/page-footer';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

  // Log page info
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('[Page Info]', {
        page: window.location.pathname,
        url: window.location.href,
        title: document.title
      });
    }
  }, []);

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
      'naver': '#00C73C',
      'kakao': '#FAE100',
      'google': '#EA4335',
      'youtube': '#FF0000',
      'facebook': '#1877F2',
      'instagram': '#E4405F',
      'direct': '#6B7280',
      'test': '#F59E0B',
      'undefined': '#9CA3AF',
    };
    return colorMap[channel.toLowerCase()] || '#9CA3AF';
  };

  const getChannelBgColor = (channel: string) => {
    const colorMap: Record<string, string> = {
      'naver': 'bg-green-500',
      'kakao': 'bg-yellow-500',
      'google': 'bg-red-500',
      'youtube': 'bg-blue-500',
      'facebook': 'bg-indigo-500',
      'instagram': 'bg-pink-500',
      'direct': 'bg-gray-500',
      'test': 'bg-orange-500',
      'undefined': 'bg-gray-400',
    };
    return colorMap[channel.toLowerCase()] || 'bg-gray-400';
  };

  const channelDataWithColors = data?.channelData.map(item => ({
    ...item,
    color: getChannelColor(item.channel),
    bgColor: getChannelBgColor(item.channel)
  })) || [];

  // Calculate percentages for donut chart
  const totalVisitors = channelDataWithColors.reduce((sum, item) => sum + item.visitors, 0);
  const pieChartData = channelDataWithColors.map(item => ({
    name: item.channel,
    value: item.visitors,
    color: item.color,
    percentage: totalVisitors > 0 ? ((item.visitors / totalVisitors) * 100).toFixed(1) : '0'
  }));

  // Format line chart data
  const lineChartData = data?.visitorTrend.current.map((point, idx) => ({
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    current: point.visitors,
    previous: data.visitorTrend.comparison[idx]?.visitors || 0
  })) || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Performance Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Overall marketing campaign performance analysis</p>
      </div>

      {/* Date Range Picker */}
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
              Last 7 days
            </button>
            <button
              onClick={() => setQuickRange(30)}
              className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              Last 30 days
            </button>
            <button
              onClick={() => setQuickRange(90)}
              className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
            {/* Total Visitors */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg flex-shrink-0">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                </div>
                <span className="text-xs sm:text-sm text-gray-600">Total Visitors</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{data.metrics.totalVisitors.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Total unique visitors</p>
            </div>

            {/* Conversions */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg flex-shrink-0">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                </div>
                <span className="text-xs sm:text-sm text-gray-600">Conversions</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{data.metrics.conversions.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Total conversions</p>
            </div>

            {/* Conversion Rate */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <span className="text-xs sm:text-sm text-gray-600">Conversion Rate</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{data.metrics.conversionRate}%</p>
              <p className="text-xs text-gray-500 mt-1">Average conversion rate</p>
            </div>

            {/* Revenue */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="p-1.5 sm:p-2 bg-orange-100 rounded-lg flex-shrink-0">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                </div>
                <span className="text-xs sm:text-sm text-gray-600">Revenue</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                ₩{data.metrics.revenue > 0 ? (data.metrics.revenue / 10000).toFixed(0) + 'M' : '0'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Total revenue</p>
            </div>
      </div>

          {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            {/* Visitor Trend Chart */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Visitor Trend by Date</h2>
                <span className="text-xs text-gray-500">Period comparison</span>
              </div>
              <div className="h-48 sm:h-56 lg:h-64">{lineChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                        stroke="#9CA3AF"
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }}
                        stroke="#9CA3AF"
                      />
                  <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '12px'
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="current" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        name="Current Period"
                        dot={{ fill: '#3B82F6', r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="previous" 
                        stroke="#10B981" 
                        strokeWidth={2}
                        name="Previous Period"
                        dot={{ fill: '#10B981', r: 3 }}
                        activeDot={{ r: 5 }}
                        strokeDasharray="5 5"
                      />
                </LineChart>
              </ResponsiveContainer>
            ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                      <TrendingUp className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-xs sm:text-sm">No trend data available</p>
                </div>
              </div>
            )}
              </div>
            </div>

            {/* Donut Chart - Channel Distribution */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Visitors by Channel</h2>
                <span className="text-xs text-gray-500">Current period breakdown</span>
              </div>
              <div className="min-h-[250px] sm:min-h-[280px]">
                {pieChartData.length > 0 ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8">
                    {/* Pie Chart */}
                    <div className="flex-shrink-0 relative w-[180px] h-[180px] sm:w-[200px] sm:h-[200px] mx-auto sm:mx-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {pieChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              fontSize: '12px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalVisitors}</p>
                        <p className="text-xs text-gray-500">Total</p>
                      </div>
                    </div>
                    
                    {/* Legend */}
                    <div className="flex-1 grid grid-cols-2 gap-2 sm:gap-3 w-full">
                      {pieChartData.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 min-w-0">
                          <div 
                            className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm flex-shrink-0" 
                            style={{ backgroundColor: item.color }}
                          ></div>
                          <span className="text-xs text-gray-600 truncate flex-1">{item.name}</span>
                          <span className="text-xs font-medium text-gray-900 flex-shrink-0">{item.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <p className="text-xs sm:text-sm">No channel data available</p>
                  </div>
                )}
                </div>
              </div>
      </div>

          {/* Channel Performance Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Channel Performance Ranking</h2>
            </div>
            
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
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
                            <div className={`w-3 h-3 ${item.bgColor} rounded-full`}></div>
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
            
            {/* Mobile/Tablet Card View */}
            <div className="lg:hidden divide-y divide-gray-200">
              {channelDataWithColors.length > 0 ? (
                channelDataWithColors.map((item, idx) => (
                  <div key={idx} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 ${item.bgColor} rounded-full`}></div>
                        <span className="text-sm font-semibold text-gray-900">{item.channel}</span>
                      </div>
                      <span className="text-sm font-medium text-green-600">{item.rate}%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500 text-xs">Visitors</span>
                        <p className="font-medium text-gray-900">{item.visitors.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">Conversions</span>
                        <p className="font-medium text-gray-900">{item.conversions}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">Revenue</span>
                        <p className="font-medium text-gray-900">₩{(item.revenue / 10000).toFixed(2)}M</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">CPA</span>
                        <p className="font-medium text-gray-900">
                          ₩{item.cpa > 0 ? (item.cpa / 10000).toFixed(0) + '만' : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No channel data available for this period
                </div>
              )}
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
