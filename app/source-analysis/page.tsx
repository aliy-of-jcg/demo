"use client";

import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { PageFooter } from '@/components/page-footer';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SourceData {
  source: string;
  mediums: Array<{
    medium: string;
    visitors: number;
    conversions: number;
    conversionRate: string;
    revenue: number;
    cpa: number;
  }>;
  totals: {
    visitors: number;
    conversions: number;
    revenue: number;
    conversionRate: string;
  };
}

interface ApiResponse {
  success: boolean;
  sources: SourceData[];
  chartData: Array<{
    name: string;
    visitors: number;
    conversions: number;
  }>;
}

export default function SourceAnalysisPage() {
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

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          start: dateRange.start,
          end: dateRange.end
        });
        const response = await fetch(`/api/analytics/source-analysis?${params}`);
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch data');
        }
        
        setData(result);
      } catch (err) {
        console.error('Error fetching source analysis data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  // Color mapping for different sources
  const getSourceColor = (source: string) => {
    const colorMap: Record<string, { bg: string; text: string }> = {
      'naver': { bg: 'bg-green-50', text: 'text-green-600' },
      'kakao': { bg: 'bg-yellow-50', text: 'text-yellow-600' },
      'google': { bg: 'bg-red-50', text: 'text-red-600' },
      'youtube': { bg: 'bg-blue-50', text: 'text-blue-600' },
      'facebook': { bg: 'bg-indigo-50', text: 'text-indigo-600' },
      'instagram': { bg: 'bg-pink-50', text: 'text-pink-600' },
      'direct': { bg: 'bg-gray-50', text: 'text-gray-600' },
    };
    return colorMap[source.toLowerCase()] || { bg: 'bg-gray-50', text: 'text-gray-600' };
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Media Detailed Analysis</h1>
        <p className="text-gray-600 mt-1">In-depth analysis of traffic sources and mediums</p>
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
          <p className="text-red-600 text-sm mt-1">Please try again or check your data connection.</p>
        </div>
      )}

      {/* Data Display */}
      {!loading && !error && data && (
        <>
          {/* Chart Section */}
          {data.chartData && data.chartData.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Media Type Comparison</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="visitors" fill="#3b82f6" name="Visitors" />
                  <Bar dataKey="conversions" fill="#f59e0b" name="Conversions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Empty State */}
          {data.sources.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No source data available for this period</p>
              <p className="text-sm text-gray-400 mt-1">Try clicking tracking links to generate data</p>
            </div>
          )}

          {/* Source Sections */}
          {data.sources.length > 0 && data.sources.map((sourceData, idx) => {
              const colors = getSourceColor(sourceData.source);
              
              return (
                <div key={idx} className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                  <div className={`p-4 ${colors.bg} border-b border-gray-200`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 capitalize">{sourceData.source}</h2>
                        <p className="text-sm text-gray-600">Total {sourceData.mediums.length} medium{sourceData.mediums.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-6 text-right">
                        <div>
                          <p className="text-xs text-gray-600">Visitors</p>
                          <p className="text-xl font-bold text-gray-900">{sourceData.totals.visitors.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Conversions</p>
                          <p className="text-xl font-bold text-gray-900">{sourceData.totals.conversions}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Conv. Rate</p>
                          <p className={`text-xl font-bold ${colors.text}`}>{sourceData.totals.conversionRate}%</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Medium
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Visitors
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Conversions
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Conv. Rate
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Revenue
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            CPA
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sourceData.mediums.map((item, mediumIdx) => (
                          <tr key={mediumIdx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.medium}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.visitors.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.conversions}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                              {item.conversionRate}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ₩{item.revenue > 0 ? (item.revenue / 10000).toFixed(0) + '만' : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ₩{item.cpa > 0 ? (item.cpa / 10000).toFixed(0) + '만' : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
        </>
      )}

      {/* Footer with extra spacing */}
      <div className="mt-8">
        <PageFooter />
      </div>
    </div>
  );
}
