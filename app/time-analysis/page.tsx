"use client";

import { useState } from 'react';
import { Calendar, Clock, TrendingUp, Users } from 'lucide-react';
import { PageFooter } from '@/components/page-footer';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function TimeAnalysisPage() {
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
    totalVisitors: 5312,
    peakHour: '10',
    peakDay: 'Wednesday',
    avgBounceRate: 76.3
  };

  // Hourly trend data (24 hours)
  const hourlyData = [
    { hour: '1시', visitors: 45 },
    { hour: '2시', visitors: 38 },
    { hour: '3시', visitors: 42 },
    { hour: '4시', visitors: 35 },
    { hour: '5시', visitors: 48 },
    { hour: '6시', visitors: 125 },
    { hour: '7시', visitors: 245 },
    { hour: '8시', visitors: 385 },
    { hour: '9시', visitors: 458 },
    { hour: '10시', visitors: 442 },
    { hour: '11시', visitors: 378 },
    { hour: '12시', visitors: 325 },
    { hour: '13시', visitors: 398 },
    { hour: '14시', visitors: 445 },
    { hour: '15시', visitors: 412 },
    { hour: '16시', visitors: 385 },
    { hour: '17시', visitors: 342 },
    { hour: '18시', visitors: 298 },
    { hour: '19시', visitors: 245 },
    { hour: '20시', visitors: 198 },
    { hour: '21시', visitors: 165 },
    { hour: '22시', visitors: 128 },
    { hour: '23시', visitors: 95 },
    { hour: '24시', visitors: 68 },
  ];

  // Day of week data
  const dayOfWeekData = [
    { day: 'Monday', visitors: 1245 },
    { day: 'Tuesday', visitors: 1382 },
    { day: 'Wednesday', visitors: 1428 },
    { day: 'Thursday', visitors: 1356 },
    { day: 'Friday', visitors: 1189 },
    { day: 'Saturday', visitors: 856 },
    { day: 'Sunday', visitors: 734 },
  ];

  // Day detail data
  const dayDetailData = [
    { 
      day: 'Monday', 
      visitors: 1245, 
      pageViews: 2.48, 
      bounceRate: 42.3, 
      peakTime: '10:00',
      color: 'bg-blue-100 text-blue-800'
    },
    { 
      day: 'Tuesday', 
      visitors: 1382, 
      pageViews: 2.55, 
      bounceRate: 40.1, 
      peakTime: '14:00',
      color: 'bg-green-100 text-green-800'
    },
    { 
      day: 'Wednesday', 
      visitors: 1428, 
      pageViews: 3.02, 
      bounceRate: 38.5, 
      peakTime: '15:00',
      color: 'bg-emerald-100 text-emerald-800'
    },
    { 
      day: 'Thursday', 
      visitors: 1356, 
      pageViews: 2.58, 
      bounceRate: 39.2, 
      peakTime: '10:00',
      color: 'bg-teal-100 text-teal-800'
    },
    { 
      day: 'Friday', 
      visitors: 1189, 
      pageViews: 2.42, 
      bounceRate: 43.8, 
      peakTime: '11:00',
      color: 'bg-cyan-100 text-cyan-800'
    },
    { 
      day: 'Saturday', 
      visitors: 856, 
      pageViews: 2.15, 
      bounceRate: 48.5, 
      peakTime: '14:00',
      color: 'bg-sky-100 text-sky-800'
    },
    { 
      day: 'Sunday', 
      visitors: 734, 
      pageViews: 2.05, 
      bounceRate: 51.2, 
      peakTime: '15:00',
      color: 'bg-red-100 text-red-800'
    },
  ];

  // Time slot detail data
  const timeSlotData = [
    { 
      timeSlot: 'Dawn (00-06h)', 
      visitors: 160, 
      bounceRate: 32.5, 
      avgPages: 1.8, 
      avgTime: '1:10',
      color: 'bg-purple-100 text-purple-800'
    },
    { 
      timeSlot: 'Morning (07-12h)', 
      visitors: 2080, 
      bounceRate: 82.3, 
      avgPages: 3.4, 
      avgTime: '3:05',
      color: 'bg-green-100 text-green-800'
    },
    { 
      timeSlot: 'Afternoon (13-18h)', 
      visitors: 2233, 
      bounceRate: 85.7, 
      avgPages: 3.6, 
      avgTime: '3:12',
      color: 'bg-emerald-100 text-emerald-800'
    },
    { 
      timeSlot: 'Evening (19-23h)', 
      visitors: 1049, 
      bounceRate: 68.4, 
      avgPages: 2.7, 
      avgTime: '2:18',
      color: 'bg-blue-100 text-blue-800'
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Time-based Analysis</h1>
        <p className="text-gray-600 mt-1">Visitor patterns by time of day and day of week</p>
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
              <p className="text-xs text-gray-500 mt-1">Selected period</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Peak Hour</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.peakHour} AM</p>
              <p className="text-xs text-gray-500 mt-1">Most active time</p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Peak Day</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.peakDay}</p>
              <p className="text-xs text-gray-500 mt-1">Most active day</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Avg. Bounce Rate</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.avgBounceRate}%</p>
              <p className="text-xs text-gray-500 mt-1">Average vs. period</p>
            </div>
            <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-pink-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Hourly Trend Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Hourly Visitor Trend</h2>
            <span className="text-xs text-gray-500">24-hour analysis</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="visitors" stroke="#3b82f6" strokeWidth={2} name="Visitors" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Day of Week Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Day of Week Distribution</h2>
            <span className="text-xs text-gray-500">Weekly pattern</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dayOfWeekData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="visitors" fill="#10b981" name="Visitors" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Day Detail Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Day of Week Detail Analysis</h2>
          <p className="text-sm text-gray-600 mt-1">Performance metrics by day</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Day
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visitors
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg. Pages
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bounce Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Peak Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dayDetailData.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.color}`}>
                      {item.day}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.visitors.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.pageViews}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={
                      item.bounceRate < 40 ? 'text-green-600' :
                      item.bounceRate < 45 ? 'text-blue-600' :
                      item.bounceRate < 50 ? 'text-yellow-600' :
                      'text-red-600'
                    }>
                      {item.bounceRate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.peakTime}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Time Slot Analysis Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Time Slot Performance Analysis</h2>
          <p className="text-sm text-gray-600 mt-1">Performance by time periods</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time Slot
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visitors
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bounce Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg. Pages
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg. Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {timeSlotData.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.color}`}>
                      {item.timeSlot}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.visitors.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={
                      item.bounceRate > 80 ? 'text-green-600' :
                      item.bounceRate > 60 ? 'text-blue-600' :
                      'text-red-600'
                    }>
                      {item.bounceRate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.avgPages}개
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.avgTime}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8">
        <PageFooter />
      </div>
    </div>
  );
}

