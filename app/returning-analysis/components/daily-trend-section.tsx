'use client';

import { useTranslations } from 'next-intl';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useReturningAnalysisDailyTrend } from '@/lib/hooks/returning-analysis/useDailyTrend';

interface DailyTrendSectionProps {
  startDate: string;
  endDate: string;
  enabled: boolean;
}

export function DailyTrendSection({
  startDate,
  endDate,
  enabled,
}: DailyTrendSectionProps) {
  const t = useTranslations('returningAnalysis');
  const { data, loading, error } = useReturningAnalysisDailyTrend({
    startDate,
    endDate,
    enabled,
  });

  if (!enabled) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
        <div className="h-6 bg-gray-300 rounded w-48 mb-4 animate-pulse"></div>
        <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
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
    return null;
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
      <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{t('charts.dailyTrend')}</h2>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: '12px' }} />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Line type="monotone" dataKey="newVisitors" stroke="#3b82f6" strokeWidth={2} name={t('charts.newVisitors')} />
          <Line type="monotone" dataKey="returningVisitors" stroke="#10b981" strokeWidth={2} name={t('insights.returningVisitors')} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

