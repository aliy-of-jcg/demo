"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Users, MousePointerClick, DollarSign, RefreshCw, Calendar } from "lucide-react";

interface PerformanceData {
  summary: {
    total_visits: number;
    unique_visitors: number;
    total_conversions: number;
    conversion_rate: number;
    ctr: number;
    avg_cpa: number;
    total_cost: number;
    avg_time_on_page: number;
    new_visitors: number;
  };
  daily_trend: Array<{
    date: string;
    visits: number;
    unique_visitors: number;
    conversions: number;
    cost: number;
    avg_time: number;
  }>;
  source_performance: Array<{
    source: string;
    visits: number;
    unique_visitors: number;
    conversions: number;
    cost: number;
    cpa: string;
    conversion_rate: string;
    avg_time: number;
  }>;
}

export default function PerformanceDashboard() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customRange, setCustomRange] = useState(false);

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      let url = '/api/performance?';
      
      if (customRange && startDate && endDate) {
        url += `start_date=${startDate}&end_date=${endDate}`;
      } else {
        const days = parseInt(dateRange);
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);
        url += `start_date=${start.toISOString().split('T')[0]}&end_date=${end.toISOString().split('T')[0]}`;
      }

      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success && result.data) {
        setData(result.data);
      } else if (result.data) {
        setData(result.data);
      }
    } catch (error) {
      console.error("Error fetching performance data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  useEffect(() => {
    if (!customRange) {
      fetchPerformanceData();
    }
  }, [dateRange]);

  const handleCustomRangeApply = () => {
    if (startDate && endDate) {
      fetchPerformanceData();
    }
  };

  const handleQuickSelect = (days: string) => {
    setCustomRange(false);
    setDateRange(days);
  };

  const summary = data?.summary || {
    total_visits: 0,
    unique_visitors: 0,
    total_conversions: 0,
    conversion_rate: 0,
    ctr: 0,
    avg_cpa: 0,
    total_cost: 0,
    avg_time_on_page: 0,
    new_visitors: 0
  };

  const dailyTrend = data?.daily_trend || [];
  const sourcePerformance = data?.source_performance || [];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Performance Dashboard</h1>
          <p className="text-gray-500 mt-2">Track campaign performance and analyze visitor behavior</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPerformanceData}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Date Range Filter */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Date Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            {/* Quick Select Buttons */}
            <div className="flex gap-2">
              <Button
                variant={!customRange && dateRange === '7' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickSelect('7')}
              >
                Last 7 Days
              </Button>
              <Button
                variant={!customRange && dateRange === '30' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickSelect('30')}
              >
                Last 30 Days
              </Button>
              <Button
                variant={!customRange && dateRange === '90' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickSelect('90')}
              >
                Last 3 Months
              </Button>
            </div>

            {/* Custom Date Range */}
            <div className="flex items-end gap-2 border-l pl-4">
              <div className="space-y-2">
                <Label htmlFor="start-date" className="text-xs">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCustomRange(true);
                  }}
                  className="w-40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date" className="text-xs">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCustomRange(true);
                  }}
                  className="w-40"
                />
              </div>
              <Button
                size="sm"
                onClick={handleCustomRangeApply}
                disabled={!startDate || !endDate || loading}
              >
                Apply
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total_visits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-600">{summary.new_visitors} new visitors</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total_conversions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-blue-600">{summary.conversion_rate}% conversion rate</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CTR</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.ctr}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-gray-600">Click-through rate</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg CPA</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₩{summary.avg_cpa.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-gray-600">Cost per acquisition</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Daily Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Performance Trend</CardTitle>
            <CardDescription>Visits, conversions, and cost over time</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="visits" stroke="#3b82f6" strokeWidth={2} name="Visits" />
                  <Line yAxisId="left" type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} name="Conversions" />
                  <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2} name="Cost (₩)" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-400">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No data available for the selected period</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Source Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Source Performance</CardTitle>
            <CardDescription>Traffic and conversions by source</CardDescription>
          </CardHeader>
          <CardContent>
            {sourcePerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sourcePerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="source" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="visits" fill="#3b82f6" name="Visits" />
                  <Bar dataKey="conversions" fill="#10b981" name="Conversions" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-400">
                <div className="text-center">
                  <MousePointerClick className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No source data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Source Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Source Analysis</CardTitle>
          <CardDescription>Performance metrics by traffic source</CardDescription>
        </CardHeader>
        <CardContent>
          {sourcePerformance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Source</th>
                    <th className="text-right py-3 px-4 font-semibold">Visits</th>
                    <th className="text-right py-3 px-4 font-semibold">Conversions</th>
                    <th className="text-right py-3 px-4 font-semibold">Conv. Rate</th>
                    <th className="text-right py-3 px-4 font-semibold">Cost</th>
                    <th className="text-right py-3 px-4 font-semibold">CPA</th>
                  </tr>
                </thead>
                <tbody>
                  {sourcePerformance.map((source, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-medium capitalize">{source.source}</span>
                      </td>
                      <td className="py-3 px-4 text-right">{source.visits.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">{source.conversions.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-blue-600 font-medium">{source.conversion_rate}%</span>
                      </td>
                      <td className="py-3 px-4 text-right">₩{source.cost.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-green-600 font-medium">₩{parseInt(source.cpa).toLocaleString()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p>No source performance data available</p>
              <p className="text-sm mt-2">Data will appear here once you have campaign traffic</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

