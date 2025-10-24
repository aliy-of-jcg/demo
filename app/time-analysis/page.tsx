"use client";

import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { PageFooter } from '@/components/page-footer';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface HourlyData {
  hour: number;
  visitors: number;
  pageviews: number;
  conversions: number;
  conversionRate: string;
}

interface DayOfWeekData {
  day: string;
  dayOfWeek: number;
  visitors: number;
  pageviews: number;
  conversions: number;
  conversionRate: string;
}

interface DailyTrendData {
  date: string;
  visitors: number;
  pageviews: number;
  conversions: number;
  conversionRate: string;
}

interface ApiResponse {
  success: boolean;
  hourly: HourlyData[];
  dayOfWeek: DayOfWeekData[];
  dailyTrend: DailyTrendData[];
  insights: {
    peakHours: Array<{ hour: number; hourLabel: string; visitors: number }>;
    peakDays: Array<{ day: string; visitors: number }>;
  };
}

export default function TimeAnalysisPage() {
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
        const response = await fetch(`/api/analytics/time-analysis?${params}`);
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch data');
        }
        
        setData(result);
      } catch (err) {
        console.error('Error fetching time analysis data:', err);
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
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900">Time-based Analysis</h1>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
            KST (UTC+9)
          </span>
        </div>
        <p className="text-gray-600 mt-1">Visitor behavior patterns by time and day</p>
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
          {data.insights && (
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Peak Hours</h3>
                <div className="space-y-2">
                  {data.insights.peakHours.map((peak, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">{peak.hourLabel}</span>
                      <span className="text-sm font-bold text-blue-600">{peak.visitors} visitors</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Peak Days</h3>
                <div className="space-y-2">
                  {data.insights.peakDays.map((peak, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">{peak.day}</span>
                      <span className="text-sm font-bold text-green-600">{peak.visitors} visitors</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Hourly Trend */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Hourly Visitor Trend <span className="text-sm font-normal text-gray-500">(KST)</span>
            </h2>
            {data.hourly.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.hourly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="hour" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(hour) => `${hour.toString().padStart(2, '0')}:00`}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(hour) => `Hour: ${hour.toString().padStart(2, '0')}:00 KST`}
                  />
                  <Legend />
                  <Bar dataKey="visitors" fill="#3b82f6" name="Visitors" />
                  <Bar dataKey="conversions" fill="#10b981" name="Conversions" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500 py-12">No hourly data available</p>
            )}
          </div>

          {/* Day of Week Trend */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Day of Week Trend</h2>
            {data.dayOfWeek.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.dayOfWeek}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="visitors" fill="#8b5cf6" name="Visitors" />
                  <Bar dataKey="conversions" fill="#f59e0b" name="Conversions" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500 py-12">No day-of-week data available</p>
            )}
          </div>

          {/* Daily Trend over Period */}
          {data.dailyTrend.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Trend</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="visitors" stroke="#3b82f6" strokeWidth={2} name="Visitors" />
                  <Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} name="Conversions" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Hourly Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Hourly Details <span className="text-sm font-normal text-gray-500">(KST)</span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hour (KST)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visitors</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pageviews</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conv. Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.hourly.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No data available</td>
                    </tr>
                  ) : (
                    data.hourly.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{row.hour.toString().padStart(2, '0')}:00</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{row.visitors.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{row.pageviews.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-green-600 font-medium">{row.conversions}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{row.conversionRate}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Day of Week Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Day of Week Details</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visitors</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pageviews</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conv. Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.dayOfWeek.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No data available</td>
                    </tr>
                  ) : (
                    data.dayOfWeek.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.day}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{row.visitors.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{row.pageviews.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-green-600 font-medium">{row.conversions}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{row.conversionRate}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Empty State */}
          {data.hourly.length === 0 && data.dayOfWeek.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No time-based data available</p>
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
