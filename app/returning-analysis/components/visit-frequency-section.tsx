'use client';

import { useTranslations } from 'next-intl';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useReturningAnalysisVisitFrequency } from '@/lib/hooks/returning-analysis/useVisitFrequency';

interface VisitFrequencySectionProps {
  startDate: string;
  endDate: string;
  enabled: boolean;
}

export function VisitFrequencySection({
  startDate,
  endDate,
  enabled,
}: VisitFrequencySectionProps) {
  const t = useTranslations('returningAnalysis');
  const { data, loading, error } = useReturningAnalysisVisitFrequency({
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
      <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{t('charts.visitFrequency')}</h2>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: '12px' }} />
          <Bar dataKey="users" fill="#8b5cf6" name={t('charts.users')} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

