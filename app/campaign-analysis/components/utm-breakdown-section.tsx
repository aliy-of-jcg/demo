'use client';

import { useState, Fragment } from 'react';
import { useTranslations } from 'next-intl';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useCampaignUTMBreakdown } from '@/lib/hooks/campaign-analysis/useUTMBreakdown';

interface UTMBreakdownSectionProps {
  campaignId: string;
  platform: string;
  startDate: string;
  endDate: string;
  deletedLinksCount?: number;
  enabled: boolean;
}

export function UTMBreakdownSection({
  campaignId,
  platform,
  startDate,
  endDate,
  deletedLinksCount,
  enabled,
}: UTMBreakdownSectionProps) {
  const t = useTranslations('campaignAnalysis');
  const { data, loading, error } = useCampaignUTMBreakdown({
    campaignId,
    platform,
    startDate,
    endDate,
    enabled,
  });

  const [expandedUtms, setExpandedUtms] = useState<Set<number>>(new Set());
  const [utmSourceFilter, setUtmSourceFilter] = useState<string>('all');
  const [utmMediumFilter, setUtmMediumFilter] = useState<string>('all');

  const toggleUtmExpansion = (utmId: number) => {
    const newExpanded = new Set(expandedUtms);
    if (newExpanded.has(utmId)) {
      newExpanded.delete(utmId);
    } else {
      newExpanded.add(utmId);
    }
    setExpandedUtms(newExpanded);
  };

  if (loading) {
    return (
      <div className="bg-gray-100 p-4 sm:p-6 rounded-lg border border-gray-200 mb-4 sm:mb-6 animate-pulse">
        <div className="h-6 bg-gray-300 rounded w-48 mb-4"></div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-300 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 sm:mb-6">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  if (!data || !data.utmBreakdown || data.utmBreakdown.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center mb-4 sm:mb-6">
        <p className="text-gray-500">No UTM codes found for this campaign</p>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">Create UTM codes to start tracking</p>
      </div>
    );
  }

  // Get unique sources and mediums from UTM breakdown for filter dropdowns
  const uniqueSources = Array.from(new Set(data.utmBreakdown.map(utm => utm.utm_source).filter(Boolean)));
  const uniqueMediums = Array.from(new Set(data.utmBreakdown.map(utm => utm.utm_medium).filter(Boolean)));

  // Filter UTMs based on source and medium selection
  const filteredUtms = data.utmBreakdown.filter(utm => {
    const sourceMatch = utmSourceFilter === 'all' || utm.utm_source === utmSourceFilter;
    const mediumMatch = utmMediumFilter === 'all' || utm.utm_medium === utmMediumFilter;
    return sourceMatch && mediumMatch;
  });

  return (
    <>
      {/* UTM Filters */}
      <div className="mb-4 sm:mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Source</label>
            <select
              value={utmSourceFilter}
              onChange={(e) => setUtmSourceFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Sources</option>
              {uniqueSources.map((source) => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Medium</label>
            <select
              value={utmMediumFilter}
              onChange={(e) => setUtmMediumFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Mediums</option>
              {uniqueMediums.map((medium) => (
                <option key={medium} value={medium}>{medium}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <div className="text-sm text-gray-600 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 whitespace-nowrap">
              Showing <span className="font-semibold text-gray-900">{filteredUtms.length}</span> of <span className="font-semibold text-gray-900">{data.utmBreakdown.length}</span> UTMs
            </div>
            {deletedLinksCount !== undefined && deletedLinksCount !== null && deletedLinksCount > 0 && (
              <div className="text-xs text-amber-600 font-medium flex items-center gap-1 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-200 whitespace-nowrap">
                <span>⚠️</span>
                <span>has {deletedLinksCount} deleted utm{deletedLinksCount !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {filteredUtms.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
          <div className="p-3 sm:p-4 border-b border-gray-200">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900">UTM Performance Comparison</h3>
            <p className="text-xs text-gray-500 mt-1">Click on any row to see daily visitor trends</p>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UTM Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medium</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clicks</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visitors</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conv. Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CTR</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUtms.map((utm) => (
                  <Fragment key={utm.id}>
                    <tr
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => toggleUtmExpansion(utm.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform ${expandedUtms.has(utm.id) ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span>{utm.name}</span>
                          {utm.landingPageTracked === false && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded border border-yellow-300"
                              title={t('warning.landingPageNotTracked')}
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              {t('warning.notTracked')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{utm.utm_source || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{utm.utm_medium || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{utm.utm_content || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{utm.metrics.clicks.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{utm.metrics.visitors.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">{utm.metrics.conversions}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{utm.metrics.conversionRate}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{utm.metrics.ctr}%</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${utm.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {utm.status}
                        </span>
                      </td>
                    </tr>
                    {expandedUtms.has(utm.id) && utm.dailyData.length > 0 && (
                      <tr>
                        <td colSpan={10} className="px-6 py-4 bg-gray-50">
                          <div className="mb-2">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Daily Visitors & Conversions - {utm.name}</h4>
                          </div>
                          <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={utm.dailyData}>
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
                              <Legend wrapperStyle={{ fontSize: '11px' }} />
                              <Line
                                type="monotone"
                                dataKey="visitors"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ fill: '#3b82f6', r: 2 }}
                                activeDot={{ r: 4 }}
                                name="Visitors"
                              />
                              <Line
                                type="monotone"
                                dataKey="conversions"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={{ fill: '#10b981', r: 2 }}
                                activeDot={{ r: 4 }}
                                name="Conversions"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Card View */}
          <div className="lg:hidden divide-y divide-gray-200">
            {filteredUtms.map((utm) => (
              <div key={utm.id} className="p-4">
                <div
                  className="flex items-center justify-between mb-3 cursor-pointer"
                  onClick={() => toggleUtmExpansion(utm.id)}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${expandedUtms.has(utm.id) ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-900">{utm.name}</span>
                    {utm.landingPageTracked === false && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded border border-yellow-300"
                        title={t('warning.landingPageNotTracked')}
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {t('warning.notTracked')}
                      </span>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${utm.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {utm.status}
                  </span>
                </div>
                <div className="flex gap-2 mb-3">
                  <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                    {utm.utm_source || 'N/A'}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800">
                    {utm.utm_medium || 'N/A'}
                  </span>
                  {utm.utm_content && (
                    <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
                      {utm.utm_content}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 text-xs">Clicks</span>
                    <p className="font-medium text-gray-900">{utm.metrics.clicks.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">Visitors</span>
                    <p className="font-medium text-gray-900">{utm.metrics.visitors.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">Conversions</span>
                    <p className="font-medium text-green-600">{utm.metrics.conversions}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">Conv. Rate</span>
                    <p className="font-medium text-gray-900">{utm.metrics.conversionRate}%</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">CTR</span>
                    <p className="font-medium text-gray-900">{utm.metrics.ctr}%</p>
                  </div>
                </div>

                {expandedUtms.has(utm.id) && utm.dailyData.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Daily Trends</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={utm.dailyData}>
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
                          name="Visitors"
                        />
                        <Line
                          type="monotone"
                          dataKey="conversions"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={{ fill: '#10b981', r: 2 }}
                          name="Conversions"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center mb-4 sm:mb-6">
          <p className="text-gray-500">No UTMs match the selected filters</p>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">Try adjusting your source or medium filters</p>
        </div>
      )}
    </>
  );
}

