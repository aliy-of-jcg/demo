"use client";

import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { PageFooter } from '@/components/page-footer';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface NewVsReturningData {
  new: {
    visitors: number;
    pageviews: number;
    conversions: number;
    conversionRate: string;
    avgTimeOnPage: number;
    percentage: string;
  };
  returning: {
    visitors: number;
    pageviews: number;
    conversions: number;
    conversionRate: string;
    avgTimeOnPage: number;
    percentage: string;
  };
}

interface FrequencyBucket {
  label: string;
  users: number;
}

interface DailyTrendData {
  date: string;
  newVisitors: number;
  returningVisitors: number;
}

interface ApiResponse {
  success: boolean;
  newVsReturning: NewVsReturningData;
  visitFrequency: FrequencyBucket[];
  returnIntervals: FrequencyBucket[];
  insights: {
    avgReturnInterval: number;
    totalReturningUsers: number;
  };
  dailyTrend: DailyTrendData[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ReturningAnalysisPage() {
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
        const response = await fetch(`/api/analytics/returning-analysis?${params}`);
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch data');
        }
        
        setData(result);
      } catch (err) {
        console.error('Error fetching returning visitor analysis data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Returning Visitor Analysis</h1>
        <p className="text-gray-600 mt-1">New vs returning visitor behavior and retention patterns</p>
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
              <h3 className="text-sm font-medium text-gray-700 mb-2">New Visitors</h3>
              <p className="text-3xl font-bold text-blue-600">{data.newVsReturning.new.visitors.toLocaleString()}</p>
              <p className="text-xs text-gray-600 mt-1">{data.newVsReturning.new.percentage}% of total</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Returning Visitors</h3>
              <p className="text-3xl font-bold text-green-600">{data.newVsReturning.returning.visitors.toLocaleString()}</p>
              <p className="text-xs text-gray-600 mt-1">{data.newVsReturning.returning.percentage}% of total</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Avg. Return Interval</h3>
              <p className="text-3xl font-bold text-orange-600">{data.insights.avgReturnInterval}</p>
              <p className="text-xs text-gray-600 mt-1">days between visits</p>
            </div>
          </div>

          {/* New vs Returning Comparison */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Visitor Distribution</h2>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'New Visitors', value: data.newVsReturning.new.visitors },
                      { name: 'Returning Visitors', value: data.newVsReturning.returning.visitors }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#3b82f6" />
                    <Cell fill="#10b981" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Comparison Metrics</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Conversion Rate</span>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 bg-blue-100 p-3 rounded">
                      <p className="text-xs text-gray-600">New</p>
                      <p className="text-lg font-bold text-blue-600">{data.newVsReturning.new.conversionRate}%</p>
                    </div>
                    <div className="flex-1 bg-green-100 p-3 rounded">
                      <p className="text-xs text-gray-600">Returning</p>
                      <p className="text-lg font-bold text-green-600">{data.newVsReturning.returning.conversionRate}%</p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Avg. Time on Page</span>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 bg-blue-100 p-3 rounded">
                      <p className="text-xs text-gray-600">New</p>
                      <p className="text-lg font-bold text-blue-600">{data.newVsReturning.new.avgTimeOnPage}s</p>
                    </div>
                    <div className="flex-1 bg-green-100 p-3 rounded">
                      <p className="text-xs text-gray-600">Returning</p>
                      <p className="text-lg font-bold text-green-600">{data.newVsReturning.returning.avgTimeOnPage}s</p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Pageviews</span>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 bg-blue-100 p-3 rounded">
                      <p className="text-xs text-gray-600">New</p>
                      <p className="text-lg font-bold text-blue-600">{data.newVsReturning.new.pageviews.toLocaleString()}</p>
                    </div>
                    <div className="flex-1 bg-green-100 p-3 rounded">
                      <p className="text-xs text-gray-600">Returning</p>
                      <p className="text-lg font-bold text-green-600">{data.newVsReturning.returning.pageviews.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Visit Frequency */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Visit Frequency Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.visitFrequency}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="users" fill="#8b5cf6" name="Users" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Return Intervals */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Return Interval Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.returnIntervals}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="users" fill="#f59e0b" name="Users" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Daily Trend */}
          {data.dailyTrend.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily New vs Returning Trend</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="newVisitors" stroke="#3b82f6" strokeWidth={2} name="New Visitors" />
                  <Line type="monotone" dataKey="returningVisitors" stroke="#10b981" strokeWidth={2} name="Returning Visitors" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Detailed Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Detailed Comparison</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metric</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">New Visitors</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Returning Visitors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Visitors</td>
                    <td className="px-6 py-4 text-sm text-blue-600">{data.newVsReturning.new.visitors.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-green-600">{data.newVsReturning.returning.visitors.toLocaleString()}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Pageviews</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{data.newVsReturning.new.pageviews.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{data.newVsReturning.returning.pageviews.toLocaleString()}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Conversions</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{data.newVsReturning.new.conversions}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{data.newVsReturning.returning.conversions}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Conversion Rate</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{data.newVsReturning.new.conversionRate}%</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{data.newVsReturning.returning.conversionRate}%</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Avg. Time on Page</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{data.newVsReturning.new.avgTimeOnPage}s</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{data.newVsReturning.returning.avgTimeOnPage}s</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Empty State */}
          {data.newVsReturning.new.visitors === 0 && data.newVsReturning.returning.visitors === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No visitor data available</p>
              <p className="text-sm text-gray-400 mt-1">Data will appear as visitors use your site</p>
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
