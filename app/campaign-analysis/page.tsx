"use client";

import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { PageFooter } from '@/components/page-footer';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

interface ApiResponse {
  success: boolean;
  campaign: CampaignData;
  platforms: string[];
  metrics: MetricsData;
  dailyData: DailyData[];
}

interface Campaign {
  id: number;
  name: string;
}

export default function CampaignAnalysisPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [dateRange, setDateRange] = useState({
    start: (() => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date.toISOString().split('T')[0];
    })(),
    end: new Date().toISOString().split('T')[0]
  });

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
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

  // Fetch campaigns list on mount
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch('/api/campaigns');
        const result = await response.json();
        if (result.campaigns && result.campaigns.length > 0) {
          setCampaigns(result.campaigns);
          setSelectedCampaign(result.campaigns[0].id.toString());
        }
      } catch (err) {
        console.error('Error fetching campaigns:', err);
      }
    };

    fetchCampaigns();
  }, []);

  // Fetch campaign analysis data when campaign or filters change
  useEffect(() => {
    if (!selectedCampaign) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          campaign_id: selectedCampaign,
          platform: selectedPlatform,
          start_date: dateRange.start,
          end_date: dateRange.end
        });
        const response = await fetch(`/api/analytics/campaign-analysis?${params}`);
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch data');
        }
        
        setData(result);
      } catch (err) {
        console.error('Error fetching campaign analysis data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedCampaign, selectedPlatform, dateRange]);

  // Platform badge colors
  const platformColors: Record<string, string> = {
    naver: 'bg-green-100 text-green-800',
    kakao: 'bg-yellow-100 text-yellow-800',
    google: 'bg-red-100 text-red-800',
    youtube: 'bg-blue-100 text-blue-800',
    facebook: 'bg-indigo-100 text-indigo-800',
    instagram: 'bg-pink-100 text-pink-800',
  };

  const getPlatformBadgeColor = (platform: string) => {
    return platformColors[platform.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  // Filter platforms based on selection
  const displayedPlatforms = data?.platforms || [];
  const filteredPlatforms = selectedPlatform === 'all' 
    ? displayedPlatforms 
    : displayedPlatforms.filter(p => p.toLowerCase() === selectedPlatform.toLowerCase());

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Campaign Performance Analysis</h1>
        <p className="text-gray-600 mt-1">Detailed performance metrics for individual campaigns</p>
      </div>

      {/* Campaign Selector */}
      <div className="mb-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Campaign</label>
        <select
          value={selectedCampaign}
          onChange={(e) => setSelectedCampaign(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {campaigns.length === 0 && <option value="">No campaigns available</option>}
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </select>

        {/* Campaign Info with Platform Badges */}
        {data && (
          <div className="mt-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{data.campaign.name}</h3>
              <p className="text-sm text-gray-600">{data.campaign.course_name || 'No course linked'}</p>
              <div className="flex gap-2 mt-2">
                {filteredPlatforms.map((platform, idx) => (
                  <span key={idx} className={`px-2 py-1 rounded text-xs font-medium ${getPlatformBadgeColor(platform)}`}>
                    {platform}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Budget</p>
              <p className="text-xl font-bold text-gray-900">₩{(data.campaign.budget / 10000).toFixed(0)}만</p>
              <p className="text-xs text-gray-500">Spent: ₩{(data.campaign.spent / 10000).toFixed(0)}만</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between gap-4">
          {/* Chart/Table Toggle - Left */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('chart')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'chart' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Chart
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'table' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Table
            </button>
          </div>

          {/* Date Range - Right */}
          <div className="flex items-center gap-4">
            {/* Platform Filter */}
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Platforms</option>
              {displayedPlatforms.map((platform, idx) => (
                <option key={idx} value={platform.toLowerCase()}>{platform}</option>
              ))}
            </select>

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

            {/* Quick Range Buttons */}
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
        </div>
      )}

      {/* Data Display */}
      {!loading && !error && data && (
        <>
          {/* Metric Cards - 6 columns */}
          <div className="grid grid-cols-6 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-600">Visitors</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{data.metrics.visitors.toLocaleString()}</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-600">Conversions</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{data.metrics.conversions}</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-pink-100 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <p className="text-xs text-gray-600">Conv. Rate</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{data.metrics.conversionRate}%</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-600">Budget</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">₩{(data.campaign.budget / 10000).toFixed(0)}만</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-600">Spend</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">₩{(data.campaign.spent / 10000).toFixed(0)}만</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                </div>
                <p className="text-xs text-gray-600">CTR</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{data.metrics.ctr}%</p>
            </div>
          </div>

          {/* Chart View */}
          {viewMode === 'chart' && (
            <>
              {data.dailyData.length > 0 ? (
                <div className="grid grid-cols-2 gap-6 mb-6">
                  {/* Daily Visitors Chart */}
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-gray-900">Daily Visitors</h3>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-0.5 bg-blue-500"></div>
                          <span className="text-gray-600">Visitors</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-0.5 bg-green-500"></div>
                          <span className="text-gray-600">Conversions</span>
                        </div>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={data.dailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          tickLine={false}
                          axisLine={{ stroke: '#e5e7eb' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          tickLine={false}
                          axisLine={{ stroke: '#e5e7eb' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="visitors" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          dot={{ fill: '#3b82f6', r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="conversions" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          dot={{ fill: '#10b981', r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Daily Cost Chart */}
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-gray-900">Daily Cost</h3>
                      <div className="flex items-center gap-1 text-sm">
                        <div className="w-3 h-3 bg-orange-500 rounded"></div>
                        <span className="text-gray-600">Cost (₩)</span>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={data.dailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          tickLine={false}
                          axisLine={{ stroke: '#e5e7eb' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          tickLine={false}
                          axisLine={{ stroke: '#e5e7eb' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '12px'
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
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center mb-6">
                  <p className="text-gray-500">No performance data available for this campaign</p>
                  <p className="text-sm text-gray-400 mt-1">Try selecting a different date range or campaign</p>
                </div>
              )}
            </>
          )}

          {/* Daily Performance Table - Always Shown */}
          {data.dailyData.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-900">Daily Performance Data</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visitors</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversions</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conv. Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CTR</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. CPC</th>
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
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center mb-6">
              <p className="text-gray-500">No performance data available for this campaign</p>
              <p className="text-sm text-gray-400 mt-1">Try selecting a different date range or campaign</p>
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
