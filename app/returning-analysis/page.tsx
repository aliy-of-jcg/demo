"use client";

import { useState } from 'react';
import { Calendar, Users, UserCheck, TrendingUp, BarChart3 } from 'lucide-react';
import { PageFooter } from '@/components/page-footer';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ReturningVisitorAnalysisPage() {
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
    totalVisitors: 8560,
    newVisitors: 5840,
    newVisitorRate: 68.3,
    returningVisitors: 2720,
    returningRate: 31.8,
    returnRate: 31.8
  };

  // New vs Returning comparison
  const newVsReturning = {
    new: {
      avgPageViews: 2.4,
      avgTime: '2:12',
      bounceRate: 52.3,
      visitors: 5840
    },
    returning: {
      avgPageViews: 4.2,
      avgTime: '4:35',
      bounceRate: 28.7,
      visitors: 2720
    }
  };

  // Daily trend data
  const dailyTrendData = [
    { date: '10/15', new: 785, returning: 412 },
    { date: '10/16', new: 742, returning: 398 },
    { date: '10/17', new: 968, returning: 445 },
    { date: '10/18', new: 821, returning: 412 },
    { date: '10/19', new: 945, returning: 432 },
    { date: '10/20', new: 892, returning: 385 },
    { date: '10/21', new: 867, returning: 356 },
  ];

  // Visit frequency data (return count)
  const visitFrequencyData = [
    { visits: '1회', count: 1685, percentage: 62.0 },
    { visits: '2회', count: 612, percentage: 22.5 },
    { visits: '3회', count: 285, percentage: 10.5 },
    { visits: '4회', count: 95, percentage: 3.5 },
    { visits: '5회 이상', count: 43, percentage: 1.6 },
  ];

  // Visit interval by first visit time
  const visitIntervalData = [
    { day: '10/16', time: '14:00', count: 645 },
    { day: '10/17', time: '10:00', count: 732 },
    { day: '10/18', time: '15:00', count: 512 },
  ];

  // New vs Returning pie chart data
  const pieChartData = [
    { name: 'New Visitors', value: 5840, color: '#3b82f6' },
    { name: 'Returning Visitors', value: 2720, color: '#10b981' },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Returning Visitor Analysis</h1>
        <p className="text-gray-600 mt-1">New vs returning visitor behavior and engagement patterns</p>
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
              <p className="text-xs text-gray-600 mb-1">Total Visitors</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalVisitors.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Total visitors</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">New Visitors</p>
              <p className="text-2xl font-bold text-blue-600">{metrics.newVisitors.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{metrics.newVisitorRate}%</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Returning Visitors</p>
              <p className="text-2xl font-bold text-green-600">{metrics.returningVisitors.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{metrics.returningRate}%</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Return Rate</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.returnRate}%</p>
              <p className="text-xs text-gray-500 mt-1">Visitor return rate</p>
            </div>
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* New vs Returning Comparison Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* New Visitors Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">New Visitors</h2>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">NEW</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Avg. Page Views</p>
              <p className="text-xl font-bold text-gray-900">{newVsReturning.new.avgPageViews}개</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Avg. Time</p>
              <p className="text-xl font-bold text-gray-900">{newVsReturning.new.avgTime}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Bounce Rate</p>
              <p className="text-xl font-bold text-red-600">{newVsReturning.new.bounceRate}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Visitors</p>
              <p className="text-xl font-bold text-blue-600">{newVsReturning.new.visitors.toLocaleString()}명</p>
            </div>
          </div>
        </div>

        {/* Returning Visitors Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Returning Visitors</h2>
            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">RETURNING</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Avg. Page Views</p>
              <p className="text-xl font-bold text-gray-900">{newVsReturning.returning.avgPageViews}개</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Avg. Time</p>
              <p className="text-xl font-bold text-gray-900">{newVsReturning.returning.avgTime}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Bounce Rate</p>
              <p className="text-xl font-bold text-green-600">{newVsReturning.returning.bounceRate}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Visitors</p>
              <p className="text-xl font-bold text-green-600">{newVsReturning.returning.visitors.toLocaleString()}명</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Daily New/Returning Trend */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Daily New/Returning Trend</h2>
            <span className="text-xs text-gray-500">Last 7 days analysis</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="new" stroke="#3b82f6" strokeWidth={2} name="New Visitors" />
              <Line type="monotone" dataKey="returning" stroke="#10b981" strokeWidth={2} name="Returning Visitors" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Visit Frequency Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Visit Frequency Distribution</h2>
            <span className="text-xs text-gray-500">Return count distribution</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={visitFrequencyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="visits" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8b5cf6" name="Visitor Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Visit Interval by First Visit */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Visit Interval by First Visit Time</h2>
            <span className="text-xs text-gray-500">First visit time vs return</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={visitIntervalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#f59e0b" name="Return Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* New vs Returning Pie Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">New vs Returning Ratio</h2>
            <span className="text-xs text-gray-500">Visitor distribution</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 flex justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-600"></div>
              <span className="text-xs text-gray-600">New Visitors (68.3%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-600"></div>
              <span className="text-xs text-gray-600">Returning (31.8%)</span>
            </div>
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

