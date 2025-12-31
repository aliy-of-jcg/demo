"use client";

import { useState, useEffect } from 'react';
import { DateRangePicker } from '@/components/date-range-picker';
import { PageFooter } from '@/components/page-footer';
import { ExportToPDFButton } from '@/components/export-to-pdf-button';
import { useTranslations } from 'next-intl';
import { useSystemSettings } from '@/lib/contexts/SystemSettingsContext';
import { TrackingStatusBadge } from '@/components/tracking-status-badge';
import { toast } from 'sonner';
import { SummarySection } from './components/summary-section';
import { DevicesSection } from './components/devices-section';
import { OSSection } from './components/os-section';
import { BrowsersSection } from './components/browsers-section';
import { ResolutionsSection } from './components/resolutions-section';
import { LazySection } from '@/app/page-flow-analysis/components/lazy-section';
import { useEnvironmentDevices } from '@/lib/hooks/environment-analysis/useDevices';

export default function EnvironmentAnalysisPage() {
  const t = useTranslations('environmentAnalysis');
  const { getInitialDateRange, isLoading: settingsLoading } = useSystemSettings();
  const MAX_RANGE_DAYS = 90;

  // Initialize after system settings load to avoid double-fetch
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  // Update date range when system settings load (GA behavior: apply defaults on first page load)
  useEffect(() => {
    if (!settingsLoading && !dateRange) {
      try {
        const initialRange = getInitialDateRange();
        setDateRange(initialRange);
      } catch (err) {
        // If settings fail, keep dateRange null and skip fetch
      }
    }
  }, [settingsLoading, getInitialDateRange, dateRange]);


  const clampDateRange = (startStr: string, endStr: string) => {
    let start = new Date(startStr);
    let end = new Date(endStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { start: startStr, end: endStr, clamped: false };
    }

    if (start > end) {
      const tmp = start;
      start = end;
      end = tmp;
    }

    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > MAX_RANGE_DAYS) {
      const clampedStart = new Date(end);
      clampedStart.setDate(clampedStart.getDate() - MAX_RANGE_DAYS);
      return {
        start: clampedStart.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
        clamped: true,
      };
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      clamped: false,
    };
  };

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


  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <TrackingStatusBadge />
          {dateRange && (
            <ExportToPDFButton
              element="[data-export-content]"
              filename={t('export.filename', { start: dateRange.start, end: dateRange.end })}
              title={t('export.title', { start: dateRange.start, end: dateRange.end })}
              size="sm"
            />
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 sm:mb-6 bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
          {/* Left: Date Range Picker */}
          {dateRange && (
            <DateRangePicker
              startDate={dateRange.start}
              endDate={dateRange.end}
              onStartDateChange={(date) => {
                if (dateRange && date !== null) {
                  if (!dateRange.end) {
                    setDateRange({ ...dateRange, start: date });
                    return;
                  }
                  const { start, end, clamped } = clampDateRange(date, dateRange.end);
                  if (clamped) {
                    toast.info(t('dateRange.limitedToMaxDays', { days: MAX_RANGE_DAYS }));
                  }
                  setDateRange({ start, end });
                }
              }}
              onEndDateChange={(date) => {
                if (dateRange && date !== null) {
                  if (!dateRange.start) {
                    setDateRange({ ...dateRange, end: date });
                    return;
                  }
                  const { start, end, clamped } = clampDateRange(dateRange.start, date);
                  if (clamped) {
                    toast.info(t('dateRange.limitedToMaxDays', { days: MAX_RANGE_DAYS }));
                  }
                  setDateRange({ start, end });
                }
              }}
              maxRangeDays={MAX_RANGE_DAYS}
              onRangeClamped={() => {
                toast.info(t('dateRange.limitedToMaxDays', { days: MAX_RANGE_DAYS }));
              }}
            />
          )}

          {/* Right: Quick Range Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setQuickRange(7)}
              className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              {t('dateRange.last7Days')}
            </button>
            <button
              onClick={() => setQuickRange(30)}
              className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              {t('dateRange.last30Days')}
            </button>
            <button
              onClick={() => setQuickRange(90)}
              className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              {t('dateRange.last3Months')}
            </button>
          </div>
        </div>
      </div>

      {dateRange && (
        <EnvironmentContent
          startDate={dateRange.start}
          endDate={dateRange.end}
        />
      )}

      {/* Footer */}
      <div className="mt-6 sm:mt-8">
        <PageFooter />
      </div>
    </div>
  );
}

function EnvironmentContent({ startDate, endDate }: { startDate: string; endDate: string }) {
  // Lift devices hook to parent to prevent duplicate fetches
  const { data: devicesData, loading: devicesLoading, error: devicesError } = useEnvironmentDevices({
    startDate,
    endDate,
    enabled: true,
  });

  return (
    <div data-export-content>
      {/* Tier 1: Immediate Load */}
      <SummarySection
        devicesData={devicesData}
        loading={devicesLoading}
        error={devicesError}
      />
      <DevicesSection
        devicesData={devicesData}
        loading={devicesLoading}
        error={devicesError}
      />

      {/* Tier 2: Viewport Lazy Load */}
      <LazySection sectionName="os">
        {(hasIntersected) => (
          <OSSection
            startDate={startDate}
            endDate={endDate}
            enabled={hasIntersected}
          />
        )}
      </LazySection>

      <LazySection sectionName="browsers">
        {(hasIntersected) => (
          <BrowsersSection
            startDate={startDate}
            endDate={endDate}
            enabled={hasIntersected}
          />
        )}
      </LazySection>

      <LazySection sectionName="resolutions">
        {(hasIntersected) => (
          <ResolutionsSection
            startDate={startDate}
            endDate={endDate}
            enabled={hasIntersected}
          />
        )}
      </LazySection>
    </div>
  );
}

