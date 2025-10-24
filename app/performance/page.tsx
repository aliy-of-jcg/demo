"use client";

import { useState } from 'react';
import { Calendar, Users, TrendingUp, DollarSign, Target } from 'lucide-react';
import { PageFooter } from '@/components/page-footer';

export default function PerformanceAnalysisPage() {
  const [dateRange, setDateRange] = useState({
    start: '2025-03-01',
    end: '2025-03-31'
  });

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

  // Static data for demo
  const metrics = {
    totalVisitors: 7135,
    conversions: 309,
    conversionRate: 4.33,
    revenue: 59640000 // 59.64M won
  };

  const channelData = [
    { channel: 'Naver', visitors: 3145, conversions: 142, rate: 4.52, revenue: 19442000, cpa: 137000, color: 'bg-green-500' },
    { channel: 'Kakao', visitors: 2286, conversions: 98, rate: 4.3, revenue: 13442000, cpa: 137000, color: 'bg-yellow-500' },
    { channel: 'Google', visitors: 987, conversions: 39, rate: 3.9, revenue: 5352000, cpa: 137000, color: 'bg-red-500' },
    { channel: 'YouTube', visitors: 717, conversions: 30, rate: 4.2, revenue: 4118000, cpa: 137000, color: 'bg-blue-500' }
  ];

  // Calculate percentages for donut chart
  const totalVisitors = channelData.reduce((sum, item) => sum + item.visitors, 0);
  const chartData = channelData.map(item => ({
    ...item,
    percentage: ((item.visitors / totalVisitors) * 100).toFixed(1)
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
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
              Apply
            </button>
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
          <p className="text-3xl font-bold text-gray-900">{metrics.totalVisitors.toLocaleString()}</p>
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
          <p className="text-3xl font-bold text-gray-900">{metrics.conversions.toLocaleString()}</p>
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
          <p className="text-3xl font-bold text-gray-900">{metrics.conversionRate}%</p>
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
          <p className="text-3xl font-bold text-gray-900">₩{(metrics.revenue / 10000).toFixed(0)}M</p>
          <p className="text-xs text-gray-500 mt-1">Total revenue</p>
            </div>
          </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Visitor Trend Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Visitor Trend by Date</h2>
            <span className="text-xs text-gray-500">Last 30 days comparison</span>
          </div>
          <div className="relative h-64">
            {/* Static SVG Chart */}
            <svg viewBox="0 0 400 200" className="w-full h-full">
              {/* Grid lines */}
              <line x1="0" y1="160" x2="400" y2="160" stroke="#e5e7eb" strokeWidth="1"/>
              <line x1="0" y1="120" x2="400" y2="120" stroke="#e5e7eb" strokeWidth="1"/>
              <line x1="0" y1="80" x2="400" y2="80" stroke="#e5e7eb" strokeWidth="1"/>
              <line x1="0" y1="40" x2="400" y2="40" stroke="#e5e7eb" strokeWidth="1"/>
              
              {/* Area chart - This Year */}
              <path
                d="M 0,140 L 50,130 L 100,120 L 150,110 L 200,115 L 250,105 L 300,100 L 350,95 L 400,100 L 400,200 L 0,200 Z"
                fill="#3b82f6"
                fillOpacity="0.2"
                stroke="#3b82f6"
                strokeWidth="2"
              />
              
              {/* Line chart - Last Year */}
              <path
                d="M 0,165 L 50,160 L 100,158 L 150,155 L 200,153 L 250,150 L 300,148 L 350,145 L 400,143"
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
              />
              
              {/* Y-axis labels */}
              <text x="-5" y="45" fontSize="10" fill="#6b7280" textAnchor="end">1,500</text>
              <text x="-5" y="85" fontSize="10" fill="#6b7280" textAnchor="end">1,000</text>
              <text x="-5" y="125" fontSize="10" fill="#6b7280" textAnchor="end">500</text>
              <text x="-5" y="165" fontSize="10" fill="#6b7280" textAnchor="end">0</text>
            </svg>
            
            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                <span className="text-xs text-gray-600">This Year</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                <span className="text-xs text-gray-600">Last Year</span>
              </div>
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
            {/* Simple Donut Chart */}
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {/* Naver - Green (44%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="35"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="20"
                  strokeDasharray="97 220"
                  strokeDashoffset="0"
                />
                {/* Kakao - Yellow (32%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="35"
                  fill="none"
                  stroke="#eab308"
                  strokeWidth="20"
                  strokeDasharray="71 220"
                  strokeDashoffset="-97"
                />
                {/* Google - Red (14%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="35"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="20"
                  strokeDasharray="31 220"
                  strokeDashoffset="-168"
                />
                {/* YouTube - Blue (10%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="35"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="20"
                  strokeDasharray="22 220"
                  strokeDashoffset="-199"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{totalVisitors.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
              </div>
                </div>
              </div>
          
          {/* Legend */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            {chartData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className={`w-3 h-3 ${item.color} rounded-sm`}></div>
                <span className="text-xs text-gray-600">{item.channel}</span>
                <span className="text-xs font-medium text-gray-900 ml-auto">{item.percentage}%</span>
              </div>
            ))}
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
              {channelData.map((item, idx) => (
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
                    ₩{(item.cpa / 10000).toFixed(0)}만
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
      </div>

      {/* Footer with extra spacing */}
      <div className="mt-8">
        <PageFooter />
            </div>
    </div>
  );
}
