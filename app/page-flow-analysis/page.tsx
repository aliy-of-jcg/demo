"use client";

import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { PageFooter } from '@/components/page-footer';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PageData {
  page: string;
  visits: number;
  avgPageviews: number;
  bounceRate: number;
  avgTimeOnPage: number;
}

interface ExitPageData {
  page: string;
  exits: number;
  exitRate: number;
}

interface UTMBreakdown {
  utm_source: string;
  total_sessions: number;
  total_pageviews: number;
  avg_pageviews_per_session: number;
}

interface ApiResponse {
  success: boolean;
  landingPages: PageData[];
  exitPages: ExitPageData[];
  utmBreakdown: UTMBreakdown[];
  insights: {
    totalSessions: number;
    totalPageviews: number;
    avgPageviewsPerSession: string;
    uniqueLandingPagesCount: number;
    avgSessionDepth: string;
  };
}

export default function PageFlowAnalysisPage() {
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

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          start_date: dateRange.start,
          end_date: dateRange.end
        });
        const response = await fetch(`/api/analytics/page-flow-analysis?${params}`);
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch data');
        }
        
        setData(result);
      } catch (err) {
        console.error('Error fetching page flow analysis data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  // Truncate long URLs for display
  const truncateUrl = (url: string, maxLength: number = 50) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  // Format seconds to time string
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">UTM Performance Analysis</h1>
        <p className="text-gray-600 mt-1">Detailed analysis of landing pages, exit pages, and UTM performance</p>
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
          </div>

          {/* Right: Quick Range Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuickRange(7)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setQuickRange(30)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setQuickRange(90)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
        </div>
      )}

      {/* Data Display */}
      {!loading && !error && data && (
        <>
          {/* 4 Summary Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Total Sessions</h3>
              <p className="text-3xl font-bold text-blue-600">{data.insights.totalSessions.toLocaleString()}</p>
              <p className="text-xs text-gray-600 mt-1">unique user sessions</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Total Pageviews</h3>
              <p className="text-3xl font-bold text-purple-600">{data.insights.totalPageviews.toLocaleString()}</p>
              <p className="text-xs text-gray-600 mt-1">all page views</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Avg Pages per Session</h3>
              <p className="text-3xl font-bold text-green-600">{data.insights.avgPageviewsPerSession}</p>
              <p className="text-xs text-gray-600 mt-1">pages viewed on average</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Landing Pages</h3>
              <p className="text-3xl font-bold text-orange-600">{data.insights.uniqueLandingPagesCount}</p>
              <p className="text-xs text-gray-600 mt-1">unique entry points</p>
            </div>
          </div>

          {/* UTM Performance Comparison Chart */}
          {data.utmBreakdown && data.utmBreakdown.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">UTM Performance Comparison</h2>
              <p className="text-sm text-gray-600 mb-4">Average page views per session by UTM source</p>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data.utmBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="utm_source" 
                    label={{ value: 'UTM Source', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    label={{ value: 'Avg Pages per Session', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      if (name === 'avg_pageviews_per_session') return [value, 'Avg Pages per Session'];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `UTM Source: ${label}`}
                  />
                  <Bar 
                    dataKey="avg_pageviews_per_session" 
                    fill="#3b82f6" 
                    name="Avg Pages per Session"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Landing Pages */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Top Landing Pages</h2>
              <p className="text-sm text-gray-600">Pages where users first enter your site</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visits</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Pages</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bounce Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.landingPages.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No landing page data</td>
                    </tr>
                  ) : (
                    data.landingPages.map((page, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900" title={page.page}>
                          {truncateUrl(page.page, 60)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-blue-600">{page.visits.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{page.avgPageviews.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <span className={page.bounceRate > 70 ? 'text-red-600 font-medium' : 'text-gray-900'}>
                            {page.bounceRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{formatTime(page.avgTimeOnPage)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Exit Pages */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Top Exit Pages</h2>
              <p className="text-sm text-gray-600">Pages where users most often leave your site</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exits</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exit Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.exitPages.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-gray-500">No exit page data</td>
                    </tr>
                  ) : (
                    data.exitPages.map((page, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900" title={page.page}>
                          {truncateUrl(page.page, 60)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-orange-600">{page.exits.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <span className={page.exitRate > 50 ? 'text-red-600 font-medium' : 'text-gray-900'}>
                            {page.exitRate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Empty State */}
          {data.landingPages.length === 0 && data.exitPages.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No data available</p>
              <p className="text-sm text-gray-400 mt-1">Data will appear as visitors navigate your site</p>
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
