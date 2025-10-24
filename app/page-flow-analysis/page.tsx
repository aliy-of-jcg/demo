"use client";

import { useState, useEffect } from 'react';
import { Calendar, ArrowRight } from 'lucide-react';
import { PageFooter } from '@/components/page-footer';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PageData {
  page: string;
  sessions: number;
  visitors: number;
  conversions?: number;
  conversionRate?: string;
  avgTimeOnPage: number;
  bounceRate?: string;
  exitRate?: string;
}

interface NavigationPattern {
  from: string;
  to: string;
  transitions: number;
  uniqueUsers: number;
}

interface PopularPage {
  page: string;
  pageviews: number;
  uniqueVisitors: number;
  avgTimeOnPage: number;
}

interface ApiResponse {
  success: boolean;
  landingPages: PageData[];
  exitPages: PageData[];
  navigationPatterns: NavigationPattern[];
  popularPages: PopularPage[];
  insights: {
    avgSessionDepth: string;
    overallBounceRate: string;
    totalSessions: number;
    depthDistribution: Array<{ depth: string; count: number }>;
  };
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Page Flow Analysis</h1>
        <p className="text-gray-600 mt-1">Landing pages, exit pages, and navigation patterns</p>
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
          {/* Insights Cards */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Avg. Session Depth</h3>
              <p className="text-3xl font-bold text-blue-600">{data.insights.avgSessionDepth}</p>
              <p className="text-xs text-gray-600 mt-1">pages per session</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Bounce Rate</h3>
              <p className="text-3xl font-bold text-orange-600">{data.insights.overallBounceRate}%</p>
              <p className="text-xs text-gray-600 mt-1">single page sessions</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Total Sessions</h3>
              <p className="text-3xl font-bold text-green-600">{data.insights.totalSessions.toLocaleString()}</p>
              <p className="text-xs text-gray-600 mt-1">in selected period</p>
            </div>
          </div>

          {/* Session Depth Distribution */}
          {data.insights.depthDistribution.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Session Depth Distribution</h2>
              <div className="grid grid-cols-2 gap-6">
                {/* Pie Chart */}
                <div>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.insights.depthDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="depth"
                      >
                        {data.insights.depthDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Legend Table */}
                <div className="flex items-center">
                  <div className="w-full">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pages</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sessions</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {data.insights.depthDistribution.map((item, idx) => {
                          const total = data.insights.depthDistribution.reduce((sum, d) => sum + d.count, 0);
                          const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0.0';
                          return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                  />
                                  <span className="font-medium text-gray-900">{item.depth}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.count.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{percentage}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Landing Pages */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Top Landing Pages</h2>
              <p className="text-sm text-gray-600">First page visitors see when entering your site</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sessions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visitors</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conv. Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg. Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.landingPages.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No landing page data</td>
                    </tr>
                  ) : (
                    data.landingPages.map((page, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900" title={page.page}>
                          {truncateUrl(page.page, 60)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{page.sessions.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{page.visitors.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-green-600 font-medium">{page.conversions || 0}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{page.conversionRate || '0.00'}%</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{page.avgTimeOnPage}s</td>
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
              <p className="text-sm text-gray-600">Last page visitors see before leaving your site</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sessions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visitors</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg. Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.exitPages.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No exit page data</td>
                    </tr>
                  ) : (
                    data.exitPages.map((page, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900" title={page.page}>
                          {truncateUrl(page.page, 60)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{page.sessions.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{page.visitors.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{page.avgTimeOnPage}s</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Navigation Patterns */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Page Navigation Patterns</h2>
              <p className="text-sm text-gray-600">Most common page-to-page transitions</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From Page</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase"></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To Page</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transitions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unique Users</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.navigationPatterns.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No navigation pattern data</td>
                    </tr>
                  ) : (
                    data.navigationPatterns.map((pattern, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900" title={pattern.from}>
                          {truncateUrl(pattern.from, 40)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <ArrowRight className="w-4 h-4 text-gray-400 mx-auto" />
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900" title={pattern.to}>
                          {truncateUrl(pattern.to, 40)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-blue-600">{pattern.transitions.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{pattern.uniqueUsers.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Popular Pages */}
          {data.popularPages.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Most Popular Pages</h2>
                <p className="text-sm text-gray-600">Pages with highest pageviews</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pageviews</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unique Visitors</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg. Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.popularPages.map((page, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900" title={page.page}>
                          {truncateUrl(page.page, 60)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-blue-600">{page.pageviews.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{page.uniqueVisitors.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{page.avgTimeOnPage}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {data.landingPages.length === 0 && data.exitPages.length === 0 && data.navigationPatterns.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No page flow data available</p>
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
