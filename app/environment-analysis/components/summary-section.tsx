'use client';

import { useTranslations } from 'next-intl';

interface DeviceItem {
  device: string;
  visitors: number;
  pageviews: number;
  conversions: number;
  conversionRate: string;
}

interface SummarySectionProps {
  devicesData: DeviceItem[] | null;
  loading: boolean;
  error: string | null;
}

export function SummarySection({
  devicesData: data,
  loading,
  error,
}: SummarySectionProps) {
  const t = useTranslations('environmentAnalysis');

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-100 p-4 sm:p-6 rounded-lg border border-gray-200 animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
            <div className="h-8 bg-gray-300 rounded w-16 mb-1"></div>
            <div className="h-3 bg-gray-300 rounded w-32"></div>
          </div>
        ))}
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

  if (!data) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
      {/* Mobile Card */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs sm:text-sm text-gray-600">{t('summary.mobileUsers')}</p>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <p className="text-2xl sm:text-3xl font-bold text-gray-900">
          {(() => {
            const mobile = data.find(d => d.device?.toLowerCase() === 'mobile');
            const total = data.reduce((sum, d) => sum + d.visitors, 0);
            const percentage = total > 0 ? ((mobile?.visitors || 0) / total * 100).toFixed(1) : '0.0';
            return percentage + '%';
          })()}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {data.find(d => d.device?.toLowerCase() === 'mobile')?.visitors.toLocaleString() || 0} {t('summary.visitors')}
        </p>
      </div>

      {/* Tablet Card */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs sm:text-sm text-gray-600">{t('summary.tabletUsers')}</p>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <p className="text-2xl sm:text-3xl font-bold text-gray-900">
          {(() => {
            const tablet = data.find(d => d.device?.toLowerCase() === 'tablet');
            const total = data.reduce((sum, d) => sum + d.visitors, 0);
            const percentage = total > 0 ? ((tablet?.visitors || 0) / total * 100).toFixed(1) : '0.0';
            return percentage + '%';
          })()}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {data.find(d => d.device?.toLowerCase() === 'tablet')?.visitors.toLocaleString() || 0} {t('summary.visitors')}
        </p>
      </div>

      {/* Desktop Card */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs sm:text-sm text-gray-600">{t('summary.desktopUsers')}</p>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <p className="text-2xl sm:text-3xl font-bold text-gray-900">
          {(() => {
            const desktop = data.find(d => d.device?.toLowerCase() === 'desktop');
            const total = data.reduce((sum, d) => sum + d.visitors, 0);
            const percentage = total > 0 ? ((desktop?.visitors || 0) / total * 100).toFixed(1) : '0.0';
            return percentage + '%';
          })()}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {data.find(d => d.device?.toLowerCase() === 'desktop')?.visitors.toLocaleString() || 0} {t('summary.visitors')}
        </p>
      </div>

      {/* Avg Conv Rate Card */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs sm:text-sm text-gray-600">{t('summary.avgConvRate')}</p>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
        <p className="text-2xl sm:text-3xl font-bold text-gray-900">
          {(() => {
            const totalVisitors = data.reduce((sum, item) => sum + item.visitors, 0);
            const totalConversions = data.reduce((sum, item) => sum + (item.conversions || 0), 0);
            const avgRate = totalVisitors > 0
              ? ((totalConversions / totalVisitors) * 100).toFixed(2)
              : '0.00';
            return avgRate + '%';
          })()}
        </p>
        <p className="text-xs text-gray-500 mt-1">{t('summary.acrossAllDevices')}</p>
      </div>
    </div>
  );
}

