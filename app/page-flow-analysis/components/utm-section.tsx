'use client';

import { useTranslations } from 'next-intl';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { usePageFlowUTM } from '@/lib/hooks/page-flow-analysis/useUTM';

interface UTMSectionProps {
  startDate: string;
  endDate: string;
  limit: number;
  search?: string;
  domain?: string;
  enabled: boolean;
}

export function UTMSection({
  startDate,
  endDate,
  limit,
  search,
  domain,
  enabled,
}: UTMSectionProps) {
  const t = useTranslations('pageFlowAnalysis');
  const { data, loading, error } = usePageFlowUTM({
    startDate,
    endDate,
    limit,
    search,
    domain,
    enabled,
  });

  if (loading) {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
        <div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-64 mb-4 animate-pulse"></div>
        <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{t('errors.loadFailed')}: {error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
      <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-4">{t('utmChart.title')}</h2>
      <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">{t('utmChart.subtitle')}</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="utm_source"
            label={{ value: t('utmChart.utmSource'), position: 'insideBottom', offset: -5, style: { fontSize: 11 } }}
            tick={{ fontSize: 10 }}
          />
          <YAxis
            label={{ value: t('utmChart.avgPagesPerSession'), angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
            tick={{ fontSize: 10 }}
          />
          <Tooltip
            formatter={(value: any, name: string) => {
              if (name === 'avg_pageviews_per_session') return [value, t('utmChart.avgPagesPerSession')];
              return [value, name];
            }}
            labelFormatter={(label) => `${t('utmChart.utmSource')}: ${label}`}
            contentStyle={{ fontSize: '12px' }}
          />
          <Bar
            dataKey="avg_pageviews_per_session"
            fill="#3b82f6"
            name={t('utmChart.avgPagesPerSession')}
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

