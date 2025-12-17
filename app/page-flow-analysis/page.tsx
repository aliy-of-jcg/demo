"use client";

import { useState, useEffect } from 'react';
import { DateRangePicker } from '@/components/date-range-picker';
import { PageFooter } from '@/components/page-footer';
import { ExportToPDFButton } from '@/components/export-to-pdf-button';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useTranslations } from 'next-intl';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';
import { useSystemSettings } from '@/lib/contexts/SystemSettingsContext';
import { TrackingStatusBadge } from '@/components/tracking-status-badge';
import { toast } from 'sonner';
import { SummarySection } from './components/summary-section';
import { UTMSection } from './components/utm-section';
import { EntryPagesSection } from './components/entry-pages-section';
import { ExitPagesSection } from './components/exit-pages-section';
import { FlowTransitionsSection } from './components/flow-transitions-section';
import { LazySection } from './components/lazy-section';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

export default function PageFlowAnalysisPage() {
  const t = useTranslations('pageFlowAnalysis');
  const { getInitialDateRange, isLoading: settingsLoading } = useSystemSettings();
  const isMobile = useIsMobile();
  const MAX_RANGE_DAYS = 90;

  // Initialize date range from system defaults (GA behavior)
  // On page reload, defaults are applied automatically
  const [dateRange, setDateRange] = useState(() => {
    // Fallback to 30 days initially (will be updated when settings load)
    const date = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return {
      start: start.toISOString().split('T')[0],
      end: date.toISOString().split('T')[0]
    };
  });

  // Update date range when system settings load (GA behavior: apply defaults on first page load)
  useEffect(() => {
    if (!settingsLoading && !dateRange) {
      try {
        const initialRange = getInitialDateRange();
        setDateRange(initialRange);
      } catch (err) {
        // Fallback handled by useState initializer
      }
    }
  }, [settingsLoading, getInitialDateRange, dateRange]);

  const [limit, setLimit] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 500);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [domains, setDomains] = useState<{ domain: string }[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(false);

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

    const rawStart = start.toISOString().split('T')[0];
    const rawEnd = end.toISOString().split('T')[0];
    const { start: finalStart, end: finalEnd, clamped } = clampDateRange(rawStart, rawEnd);

    if (clamped) {
      toast.info(t('dateRange.limitedToMaxDays', { days: MAX_RANGE_DAYS }));
    }

    setDateRange({
      start: finalStart,
      end: finalEnd
    });
  };

  // Fetch domains for dropdown
  useEffect(() => {
    // Wait for system settings to load so we fetch once with the correct defaults
    if (settingsLoading || !dateRange) {
      return;
    }

    const fetchDomains = async () => {
      setDomainsLoading(true);
      try {
        const params = new URLSearchParams({
          start: dateRange.start,
          end: dateRange.end
        });
        const response = await fetchWithAuth(`/api/analytics/tracked-websites?${params}`);
        const result = await response.json();

        if (result.success && result.websites) {
          setDomains(result.websites.map((w: { domain: string }) => ({ domain: w.domain })));
        }
      } catch (err) {
        console.error('Error fetching domains:', err);
      } finally {
        setDomainsLoading(false);
      }
    };

    fetchDomains();
  }, [dateRange, settingsLoading]);

  if (!dateRange) {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">{t('subtitle')}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <TrackingStatusBadge />
            <ExportToPDFButton
              element="[data-export-content]"
              filename={t('export.filename', { start: dateRange.start, end: dateRange.end })}
              title={t('export.title', { start: dateRange.start, end: dateRange.end })}
              label={t('export.buttonLabel')}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 sm:mb-6 bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
          {/* Left: Date Range Picker */}
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

      {/* Data Display */}
      <div data-export-content>
        {/* Tier 1: Immediate Load - Summary (always) */}
        <SummarySection
          startDate={dateRange.start}
          endDate={dateRange.end}
          limit={limit}
          search={debouncedSearch}
          domain={selectedDomain}
          enabled={true}
        />

        {/* Tier 1: Immediate Load - UTM (desktop) / Lazy (mobile) */}
        {isMobile ? (
          <LazySection sectionName="utm">
            {(hasIntersected) => (
              <UTMSection
                startDate={dateRange.start}
                endDate={dateRange.end}
                limit={limit}
                search={debouncedSearch}
                domain={selectedDomain}
                enabled={hasIntersected}
              />
            )}
          </LazySection>
        ) : (
          <UTMSection
            startDate={dateRange.start}
            endDate={dateRange.end}
            limit={limit}
            search={debouncedSearch}
            domain={selectedDomain}
            enabled={true}
          />
        )}

        {/* Tier 2: Viewport Lazy - Landing Pages */}
        <LazySection sectionName="landing">
          {(hasIntersected) => (
            <EntryPagesSection
              startDate={dateRange.start}
              endDate={dateRange.end}
              limit={limit}
              search={debouncedSearch}
              domain={selectedDomain}
              enabled={hasIntersected}
              searchInput={searchInput}
              onSearchChange={setSearchInput}
              selectedDomain={selectedDomain}
              onDomainChange={setSelectedDomain}
              onLimitChange={setLimit}
              domains={domains}
              domainsLoading={domainsLoading}
            />
          )}
        </LazySection>

        {/* Tier 2: Viewport Lazy - Exit Pages */}
        <LazySection sectionName="exit">
          {(hasIntersected) => (
            <ExitPagesSection
              startDate={dateRange.start}
              endDate={dateRange.end}
              limit={limit}
              search={debouncedSearch}
              domain={selectedDomain}
              enabled={hasIntersected}
            />
          )}
        </LazySection>

        {/* Tier 3: Viewport Lazy - Page Transitions */}
        <LazySection sectionName="page transition">
          {(hasIntersected) => (
            <FlowTransitionsSection
              startDate={dateRange.start}
              endDate={dateRange.end}
              limit={limit}
              search={debouncedSearch}
              domain={selectedDomain}
              enabled={hasIntersected}
            />
          )}
        </LazySection>
      </div>

      {/* Footer */}
      <div className="mt-8">
        <PageFooter />
      </div>
    </div>
  );
}
