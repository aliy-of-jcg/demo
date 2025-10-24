"use client";

import { useState } from 'react';
import { Calendar, FileText, LogOut, TrendingUp, MousePointer } from 'lucide-react';
import { PageFooter } from '@/components/page-footer';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function PageFlowAnalysisPage() {
  const [dateRange, setDateRange] = useState({
    start: '2025-09-21',
    end: '2025-10-20'
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

  // Summary metrics
  const metrics = {
    totalPages: 7520,
    totalPageViews: 27262,
    avgPagesPerSession: 3.63,
    topPages: 5
  };

  // UTM-based page views comparison (by source)
  const utmPageViewData = [
    { source: 'Naver', avgPages: 3.8 },
    { source: 'Kakao', avgPages: 3.2 },
    { source: 'Google', avgPages: 4.1 },
    { source: 'YouTube', avgPages: 2.6 },
  ];

  // Top landing pages
  const landingPages = [
    { 
      page: 'AI Course Homepage', 
      path: '/courses/ai-education',
      visitors: 2450, 
      avgTime: '3.2 min', 
      bounceRate: 38.5,
      nextPage: '2:45'
    },
    { 
      page: 'Digital Marketing Course', 
      path: '/courses/digital-marketing',
      visitors: 1820, 
      avgTime: '2.8 min', 
      bounceRate: 42.1,
      nextPage: '2:18'
    },
    { 
      page: 'Data Analysis Course', 
      path: '/courses/data-analysis',
      visitors: 1560, 
      avgTime: '3.5 min', 
      bounceRate: 35.2,
      nextPage: '3:12'
    },
    { 
      page: 'Python Basics', 
      path: '/courses/python',
      visitors: 1120, 
      avgTime: '2.4 min', 
      bounceRate: 45.8,
      nextPage: '1:56'
    },
    { 
      page: 'Homepage', 
      path: '/',
      visitors: 980, 
      avgTime: '1.8 min', 
      bounceRate: 58.3,
      nextPage: '1:22'
    },
  ];

  // Top exit pages
  const exitPages = [
    { 
      page: 'AI Course Homepage', 
      path: '/courses/ai-education',
      exitCount: 943, 
      exitRate: 38.5
    },
    { 
      page: 'Application Form', 
      path: '/apply/form',
      exitCount: 521, 
      exitRate: 32.4
    },
    { 
      page: 'Homepage', 
      path: '/',
      exitCount: 571, 
      exitRate: 58.3
    },
    { 
      page: 'Curriculum Details', 
      path: '/curriculum',
      exitCount: 482, 
      exitRate: 40
    },
    { 
      page: 'Instructor Introduction', 
      path: '/instructors',
      exitCount: 262, 
      exitRate: 39.8
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Page Flow Analysis</h1>
        <p className="text-gray-600 mt-1">User navigation patterns, landing pages, and exit points</p>
      </div>

      {/* Date Range Filter */}
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

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Total Pages</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalPages.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Active page count</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Total Page Views</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalPageViews.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Total page visits</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <MousePointer className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Avg. Pages/Session</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.avgPagesPerSession}</p>
              <p className="text-xs text-gray-500 mt-1">Per session average</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Top Pages</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.topPages}</p>
              <p className="text-xs text-gray-500 mt-1">Most visited pages</p>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* UTM-based Page Views Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">UTM-based Page Views Comparison</h2>
          <span className="text-xs text-gray-500">Average pages per visit by source</span>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={utmPageViewData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="source" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="avgPages" fill="#3b82f6" name="Avg. Pages per Visit" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Landing and Exit Pages Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Landing Pages */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Top Landing Pages</h2>
            <p className="text-sm text-gray-600 mt-1">Most common entry points</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Page
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visitors
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg. Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bounce
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Next Page
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {landingPages.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.page}</p>
                        <p className="text-xs text-gray-500">{item.path}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {item.visitors.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {item.avgTime}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.bounceRate < 40 ? 'bg-green-100 text-green-800' :
                        item.bounceRate < 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.bounceRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {item.nextPage}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Exit Pages */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Top Exit Pages</h2>
            <p className="text-sm text-gray-600 mt-1">Most common exit points</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Page
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exit Count
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exit Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {exitPages.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.page}</p>
                        <p className="text-xs text-gray-500">{item.path}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.exitCount}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.exitRate < 40 ? 'bg-green-100 text-green-800' :
                        item.exitRate < 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.exitRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8">
        <PageFooter />
      </div>
    </div>
  );
}

