"use client";

import { useState } from 'react';
import { Calendar, Download } from 'lucide-react';
import { PageFooter } from '@/components/page-footer';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function SourceAnalysisPage() {
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

  // Grouped data by source
  const naverData = [
    { medium: 'cpc', visitors: 1823, conversions: 78, conversionRate: 4.28, revenue: 10692000, cpa: 137000 },
    { medium: 'organic', visitors: 1322, conversions: 64, conversionRate: 4.84, revenue: 8768000, cpa: 137000 },
    { medium: 'display (retargeting)', visitors: 567, visitors: 32, conversions: 32, conversionRate: 5.64, revenue: 4384000, cpa: 137000 },
  ];

  const kakaoData = [
    { medium: 'cpc (brand)', visitors: 1456, conversions: 71, conversionRate: 4.88, revenue: 9727000, cpa: 137000 },
    { medium: 'cpc (non-brand)', visitors: 830, conversions: 27, conversionRate: 3.25, revenue: 3699000, cpa: 137000 },
    { medium: 'display (channel)', visitors: 512, conversions: 18, conversions: 18, conversionRate: 3.52, revenue: 2466000, cpa: 137000 },
  ];

  // Calculate totals
  const naverTotals = naverData.reduce((acc, item) => ({
    visitors: acc.visitors + item.visitors,
    conversions: acc.conversions + item.conversions,
    revenue: acc.revenue + item.revenue
  }), { visitors: 0, conversions: 0, revenue: 0 });

  const kakaoTotals = kakaoData.reduce((acc, item) => ({
    visitors: acc.visitors + item.visitors,
    conversions: acc.conversions + item.conversions,
    revenue: acc.revenue + item.revenue
  }), { visitors: 0, conversions: 0, revenue: 0 });

  const naverAvgRate = ((naverTotals.conversions / naverTotals.visitors) * 100).toFixed(2);
  const kakaoAvgRate = ((kakaoTotals.conversions / kakaoTotals.visitors) * 100).toFixed(2);

  // Chart data
  const chartData = [
    { name: 'CPC', visitors: 1823, conversions: 78 },
    { name: 'Organic', visitors: 1322, conversions: 64 },
    { name: 'Display', visitors: 567, conversions: 32 },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Media Detailed Analysis</h1>
        <p className="text-gray-600 mt-1">In-depth analysis of traffic sources and mediums</p>
      </div>

      {/* Filters */}
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

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Media Type Comparison</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="visitors" fill="#3b82f6" name="Visitors" />
            <Bar dataKey="conversions" fill="#f59e0b" name="Conversions" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Naver Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-4 bg-green-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Naver</h2>
              <p className="text-sm text-gray-600">Total {naverData.length} mediums</p>
            </div>
            <div className="grid grid-cols-3 gap-6 text-right">
              <div>
                <p className="text-xs text-gray-600">Visitors</p>
                <p className="text-xl font-bold text-gray-900">{naverTotals.visitors.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Conversions</p>
                <p className="text-xl font-bold text-gray-900">{naverTotals.conversions}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Conv. Rate</p>
                <p className="text-xl font-bold text-green-600">{naverAvgRate}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Medium
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visitors
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conv. Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CPA
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {naverData.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.medium}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.visitors.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.conversions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    {item.conversionRate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₩{(item.revenue / 10000).toFixed(0)}만
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₩{(item.cpa / 10000).toFixed(0)}만
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button className="text-blue-600 hover:text-blue-800">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kakao Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-4 bg-yellow-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Kakao</h2>
              <p className="text-sm text-gray-600">Total {kakaoData.length} mediums</p>
            </div>
            <div className="grid grid-cols-3 gap-6 text-right">
              <div>
                <p className="text-xs text-gray-600">Visitors</p>
                <p className="text-xl font-bold text-gray-900">{kakaoTotals.visitors.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Conversions</p>
                <p className="text-xl font-bold text-gray-900">{kakaoTotals.conversions}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Conv. Rate</p>
                <p className="text-xl font-bold text-yellow-600">{kakaoAvgRate}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Medium
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visitors
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conv. Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CPA
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {kakaoData.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.medium}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.visitors.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.conversions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    {item.conversionRate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₩{(item.revenue / 10000).toFixed(0)}만
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₩{(item.cpa / 10000).toFixed(0)}만
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button className="text-blue-600 hover:text-blue-800">View</button>
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
