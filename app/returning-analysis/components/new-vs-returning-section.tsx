'use client';

import { useTranslations } from 'next-intl';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useReturningAnalysisNewVsReturning } from '@/lib/hooks/returning-analysis/useNewVsReturning';

interface NewVsReturningSectionProps {
  startDate: string;
  endDate: string;
  enabled: boolean;
}

export function NewVsReturningSection({
  startDate,
  endDate,
  enabled,
}: NewVsReturningSectionProps) {
  const t = useTranslations('returningAnalysis');
  const { data, loading, error } = useReturningAnalysisNewVsReturning({
    startDate,
    endDate,
    enabled,
  });

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="bg-gray-100 p-4 sm:p-6 rounded-lg border border-gray-200 animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-48 mb-4"></div>
          <div className="h-48 bg-gray-300 rounded"></div>
        </div>
        <div className="bg-gray-100 p-4 sm:p-6 rounded-lg border border-gray-200 animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-48 mb-4"></div>
          <div className="space-y-4">
            <div className="h-16 bg-gray-300 rounded"></div>
            <div className="h-16 bg-gray-300 rounded"></div>
            <div className="h-16 bg-gray-300 rounded"></div>
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

  if (!enabled) {
    return null;
  }

  if (!data) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{t('charts.visitorDistribution')}</h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="w-full sm:w-auto">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={[
                    { name: t('metrics.new'), value: data.new.visitors },
                    { name: t('metrics.returning'), value: data.returning.visitors }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={false}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#10b981" />
                </Pie>
                <Tooltip
                  formatter={(value: any, name: string) => [
                    `${value.toLocaleString()} ${t('table.visitors').toLowerCase()}`,
                    name === t('metrics.new') ? t('insights.newVisitors') : t('insights.returningVisitors')
                  ]}
                  contentStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-row sm:flex-col gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-700">{t('insights.newVisitors')}</p>
                <p className="text-sm sm:text-base font-bold text-blue-600">
                  {data.new.visitors.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">{data.new.percentage}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-700">{t('charts.returning')}</p>
                <p className="text-sm sm:text-base font-bold text-green-600">
                  {data.returning.visitors.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">{data.returning.percentage}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">{t('charts.comparisonMetrics')}</h2>
        <div className="space-y-3 sm:space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs sm:text-sm text-gray-600">{t('metrics.conversionRate')}</span>
            </div>
            <div className="flex gap-2 sm:gap-4">
              <div className="flex-1 bg-blue-100 p-2 sm:p-3 rounded">
                <p className="text-xs text-gray-600">{t('metrics.new')}</p>
                <p className="text-base sm:text-lg font-bold text-blue-600">{data.new.conversionRate}%</p>
              </div>
              <div className="flex-1 bg-green-100 p-2 sm:p-3 rounded">
                <p className="text-xs text-gray-600">{t('metrics.returning')}</p>
                <p className="text-base sm:text-lg font-bold text-green-600">{data.returning.conversionRate}%</p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs sm:text-sm text-gray-600">{t('metrics.avgTimeOnPage')}</span>
            </div>
            <div className="flex gap-2 sm:gap-4">
              <div className="flex-1 bg-blue-100 p-2 sm:p-3 rounded">
                <p className="text-xs text-gray-600">{t('metrics.new')}</p>
                <p className="text-base sm:text-lg font-bold text-blue-600">{data.new.avgTimeOnPage}s</p>
              </div>
              <div className="flex-1 bg-green-100 p-2 sm:p-3 rounded">
                <p className="text-xs text-gray-600">{t('metrics.returning')}</p>
                <p className="text-base sm:text-lg font-bold text-green-600">{data.returning.avgTimeOnPage}s</p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs sm:text-sm text-gray-600">{t('metrics.pageviews')}</span>
            </div>
            <div className="flex gap-2 sm:gap-4">
              <div className="flex-1 bg-blue-100 p-2 sm:p-3 rounded">
                <p className="text-xs text-gray-600">{t('metrics.new')}</p>
                <p className="text-base sm:text-lg font-bold text-blue-600">{data.new.pageviews.toLocaleString()}</p>
              </div>
              <div className="flex-1 bg-green-100 p-2 sm:p-3 rounded">
                <p className="text-xs text-gray-600">{t('metrics.returning')}</p>
                <p className="text-base sm:text-lg font-bold text-green-600">{data.returning.pageviews.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

