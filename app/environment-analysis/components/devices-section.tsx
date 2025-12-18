'use client';

import { useTranslations } from 'next-intl';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

interface DeviceItem {
  device: string;
  visitors: number;
  pageviews: number;
  conversions: number;
  conversionRate: string;
}

interface DevicesSectionProps {
  devicesData: DeviceItem[] | null;
  loading: boolean;
  error: string | null;
}

export function DevicesSection({
  devicesData: data,
  loading,
  error,
}: DevicesSectionProps) {
  const t = useTranslations('environmentAnalysis');

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="bg-gray-100 p-4 sm:p-6 rounded-lg border border-gray-200 animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-32 mb-4"></div>
          <div className="h-48 bg-gray-300 rounded"></div>
        </div>
        <div className="bg-gray-100 p-4 sm:p-6 rounded-lg border border-gray-200 animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-32 mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 sm:mb-6">
        <p className="text-red-800">{t('errors.loadFailed')}: {error}</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">{t('sections.deviceType')}</h2>
          <p className="text-center text-gray-500 py-12 text-sm">{t('empty.noDeviceData')}</p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">{t('sections.deviceStatistics')}</h2>
          <p className="text-center text-gray-500 py-12 text-sm">{t('empty.noDeviceData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">{t('sections.deviceType')}</h2>
        <div className="space-y-4">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data.map(d => ({ name: d.device || 'Unknown', value: d.visitors }))}
                cx="50%"
                cy="50%"
                outerRadius={85}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          {/* Device Legend */}
          <div className="grid grid-cols-2 gap-2">
            {data.map((device, idx) => {
              const total = data.reduce((sum, d) => sum + d.visitors, 0);
              const percentage = total > 0 ? ((device.visitors / total) * 100).toFixed(0) : '0';
              return (
                <div key={idx} className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  ></div>
                  <span className="text-xs text-gray-700 truncate flex-1 capitalize">{device.device || 'Unknown'}</span>
                  <span className="text-xs font-medium text-gray-900 flex-shrink-0">{percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">{t('sections.deviceStatistics')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('table.device')}</th>
                <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('table.visitors')}</th>
                <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('table.convRate')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900 capitalize">{item.device || 'Unknown'}</td>
                  <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900">{item.visitors.toLocaleString()}</td>
                  <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-green-600">{item.conversionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

