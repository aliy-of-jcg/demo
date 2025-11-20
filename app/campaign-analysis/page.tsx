"use client";

import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { PageFooter } from '@/components/page-footer';
import {ExportToPDFButton} from '@/components/export-to-pdf-button';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('campaignAnalysis');
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
  <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
    <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">{t('subtitle')}</p>
      </div>
          
        <ExportToPDFButton
          element="[data-export-content]"
          filename={t('export.filename', { start: dateRange.start, end: dateRange.end })}
          title={t('export.title', { start: dateRange.start, end: dateRange.end })}
          size="sm"
        />
      </div>
    
     {/* Campaign Selector */}
      <div className="mb-4 sm:mb-6 bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">{t('selectCampaign')}</label>
        <select
          value={selectedCampaign}
          onChange={(e) => setSelectedCampaign(e.target.value)}
          className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {campaigns.length === 0 && <option value="">{t('noCampaigns')}</option>}
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </select>

        {/* Campaign Info with Platform Badges */}
        {data && (
          <div className="mt-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">{data.campaign.name}</h3>
              <p className="text-xs sm:text-sm text-gray-600">{data.campaign.course_name || t('noCourseLinked')}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {filteredPlatforms.map((platform, idx) => (
                  <span key={idx} className={`px-2 py-1 rounded text-xs font-medium ${getPlatformBadgeColor(platform)}`}>
                    {platform}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-left lg:text-right">
              <p className="text-xs sm:text-sm text-gray-600">{t('budget')}</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">₩{(data.campaign.budget / 10000).toFixed(0)}만</p>
              <p className="text-xs text-gray-500">{t('spent')}: ₩{(data.campaign.spent / 10000).toFixed(0)}만</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 sm:mb-6 bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col gap-3">
          {/* Chart/Table Toggle - Top */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('chart')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                viewMode === 'chart' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('viewMode.chart')}
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                viewMode === 'table' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('viewMode.table')}
            </button>
          </div>

          {/* Filters - Bottom */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 sm:gap-4">
            {/* Platform Filter */}
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm"
            >
              <option value="all">{t('filters.allPlatforms')}</option>
              {displayedPlatforms.map((platform, idx) => (
                <option key={idx} value={platform.toLowerCase()}>{platform}</option>
              ))}
            </select>

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

              {/* Quick Range Buttons */}
              <button
                onClick={() => setQuickRange(7)}
                className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                {t('filters.last7Days')}
              </button>
              <button
                onClick={() => setQuickRange(30)}
                className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                {t('filters.last30Days')}
              </button>
              <button
                onClick={() => setQuickRange(90)}
                className="hidden sm:inline-block px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                {t('filters.last3Months')}
              </button>
            </div>
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
        <div data-export-content>
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
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{data.metrics.visitors.toLocaleString()}</p>
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
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{data.metrics.conversions}</p>
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
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{data.metrics.conversionRate}%</p>
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
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{data.metrics.ctr}%</p>
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
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900">Daily Visitors</h3>
                      <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                        <div className="flex items-center gap-1">
                          <div className="w-2.5 h-0.5 sm:w-3 sm:h-0.5 bg-blue-500"></div>
                          <span className="text-gray-600">Visitors</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2.5 h-0.5 sm:w-3 sm:h-0.5 bg-green-500"></div>
                          <span className="text-gray-600">Conversions</span>
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
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900">Daily Cost</h3>
                      <div className="flex items-center gap-1 text-xs sm:text-sm">
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-orange-500 rounded"></div>
                        <span className="text-gray-600">Cost (₩)</span>
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
                  <p className="text-gray-500">No performance data available for this campaign</p>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1">Try selecting a different date range or campaign</p>
                </div>
              )}
            </>
          )}

          {/* Daily Performance Table - Always Shown */}
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
        </div>
      )}

      {/* Footer */}
      <div className="mt-8">
        <PageFooter />
      </div>
    </div>
  );
}
