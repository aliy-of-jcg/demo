"use client";

import { useState, useEffect } from 'react';
import { Calendar, Download } from 'lucide-react';
import { PageFooter } from '@/components/page-footer';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function CampaignAnalysisPage() {
  const [dateRange, setDateRange] = useState({
    start: '2025-09-21',
    end: '2025-10-20'
  });

  const [selectedCampaign, setSelectedCampaign] = useState('2501_ai_education');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [viewMode, setViewMode] = useState('chart'); // chart or table

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

  // Sample campaigns with their platforms
  const campaigns = [
    { 
      id: '2501_ai_education', 
      name: '2501 ai education - Full Training Course',
      platforms: ['naver', 'kakao', 'google']
    },
    { 
      id: '2502_web_dev', 
      name: '2502 web development - Web Dev Bootcamp',
      platforms: ['google', 'youtube']
    },
    { 
      id: '2503_data_science', 
      name: '2503 data science - Data Analysis',
      platforms: ['naver', 'facebook']
    },
  ];

  // Get current campaign data
  const currentCampaign = campaigns.find(c => c.id === selectedCampaign) || campaigns[0];

  // Platform display names
  const platformNames: Record<string, string> = {
    'naver': 'Naver',
    'kakao': 'Kakao',
    'google': 'Google',
    'youtube': 'YouTube',
    'facebook': 'Facebook',
    'instagram': 'Instagram'
  };

  // Platform colors
  const platformColors: Record<string, string> = {
    'naver': 'bg-green-100 text-green-800',
    'kakao': 'bg-yellow-100 text-yellow-800',
    'google': 'bg-blue-100 text-blue-800',
    'youtube': 'bg-red-100 text-red-800',
    'facebook': 'bg-indigo-100 text-indigo-800',
    'instagram': 'bg-pink-100 text-pink-800'
  };

  // Metrics data
  const metrics = {
    visitors: 1240,
    conversions: 52,
    conversionRate: 4.19,
    revenue: 8500000,
    cpa: 163460,
    roas: 3.2
  };

  // Visitor trend data
  const trendData = [
    { date: '10/12', thisYear: 180, lastYear: 150 },
    { date: '10/14', thisYear: 165, lastYear: 145 },
    { date: '10/16', thisYear: 178, lastYear: 155 },
    { date: '10/17', thisYear: 195, lastYear: 160 },
    { date: '10/18', thisYear: 172, lastYear: 150 },
    { date: '10/19', thisYear: 185, lastYear: 148 },
    { date: '10/20', thisYear: 165, lastYear: 142 },
    { date: '10/21', thisYear: 0, lastYear: 140 },
  ];

  // Visit time distribution
  const timeData = [
    { hour: '14:00', visits: 1200000 },
    { hour: '15:00', visits: 1350000 },
    { hour: '16:00', visits: 1280000 },
    { hour: '17:00', visits: 1400000 },
    { hour: '18:00', visits: 1520000 },
    { hour: '19:00', visits: 1480000 },
    { hour: '20:00', visits: 1350000 },
    { hour: '21:00', visits: 1100000 },
  ];

  // Daily performance data
  const dailyData = [
    { date: '2025-10-15', visitors: 365, conversions: 7, rate: 4.24, revenue: 11450000, cpa: 163460, cpc: 697 },
    { date: '2025-10-15', visitors: 362, conversions: 9, rate: 4.85, revenue: 12450000, cpa: 138405, cpc: 697 },
    { date: '2025-10-15', visitors: 357, conversions: 8, rate: 4.65, revenue: 11680000, cpa: 146000, cpc: 697 },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Campaign Performance Analysis</h1>
        <p className="text-gray-600 mt-1">Detailed insights into individual campaign performance</p>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        {/* Campaign Selector and Chart/Table Toggle Row */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Campaign:</span>
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {campaigns.map(campaign => (
                <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
              ))}
            </select>
          </div>

          {/* Chart/Table Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                viewMode === 'chart'
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Chart
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Table
            </button>
          </div>
        </div>

        {/* Date Range Row */}
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

      {/* Campaign Info */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{currentCampaign.name}</h2>
            <div className="flex items-center gap-2 mt-2">
              {/* Show platforms based on filter */}
              {selectedPlatform === 'all' ? (
                // Show all platforms when "All Platforms" is selected
                currentCampaign.platforms.map((platform) => (
                  <span
                    key={platform}
                    className={`px-2 py-1 text-xs font-medium rounded-full ${platformColors[platform]}`}
                  >
                    {platformNames[platform]}
                  </span>
                ))
              ) : (
                // Show only selected platform
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${platformColors[selectedPlatform]}`}
                >
                  {platformNames[selectedPlatform]}
                </span>
              )}
            </div>
          </div>

          {/* Platform Filter - Dynamic based on campaign */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Media Platform:</span>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Platforms ({currentCampaign.platforms.length})</option>
              {currentCampaign.platforms.map((platform) => (
                <option key={platform} value={platform}>
                  {platformNames[platform]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">Visitors</p>
          <p className="text-2xl font-bold text-gray-900">{metrics.visitors.toLocaleString()}</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">Conversions</p>
          <p className="text-2xl font-bold text-gray-900">{metrics.conversions}</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">Conv. Rate</p>
          <p className="text-2xl font-bold text-green-600">{metrics.conversionRate}%</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">Revenue</p>
          <p className="text-2xl font-bold text-gray-900">₩{(metrics.revenue / 10000).toFixed(0)}만</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">CPA</p>
          <p className="text-2xl font-bold text-gray-900">₩{(metrics.cpa / 10000).toFixed(1)}만</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">ROAS</p>
          <p className="text-2xl font-bold text-blue-600">{metrics.roas}%</p>
        </div>
      </div>

      {/* Charts Row - Only show when viewMode is 'chart' */}
      {viewMode === 'chart' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Visitor Trend Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Visitor Trend by Date</h2>
              <span className="text-xs text-gray-500">Year-over-year comparison</span>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="thisYear" stroke="#3b82f6" strokeWidth={2} name="This Year" />
                <Line type="monotone" dataKey="lastYear" stroke="#10b981" strokeWidth={2} name="Last Year" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Visit Time Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Visit Time Distribution</h2>
              <span className="text-xs text-gray-500">Hourly breakdown</span>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="visits" fill="#f59e0b" name="Visits" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Daily Performance Table - Only show when viewMode is 'table' */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Campaign Daily Breakdown</h2>
          <p className="text-sm text-gray-600 mt-1">Detailed performance by day</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
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
                  Avg. CPC
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dailyData.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.visitors}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.conversions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    {item.rate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₩{(item.revenue / 10000).toFixed(0)}만
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₩{(item.cpa / 10000).toFixed(1)}만
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₩{item.cpc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Footer with extra spacing */}
      <div className="mt-8">
        <PageFooter />
      </div>
    </div>
  );
}

