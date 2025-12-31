"use client";

import { useState, useEffect } from 'react';
import { DateRangePicker } from '@/components/date-range-picker';
import { PageFooter } from '@/components/page-footer';
import { ExportToPDFButton } from '@/components/export-to-pdf-button';
import { useTranslations } from 'next-intl';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';
import { useSystemSettings } from '@/lib/contexts/SystemSettingsContext';
import { TrackingStatusBadge } from '@/components/tracking-status-badge';
import { toast } from 'sonner';
import { MetricsSection } from './components/metrics-section';
import { UTMBreakdownSection } from './components/utm-breakdown-section';
import { useCampaignMetrics } from '@/lib/hooks/campaign-analysis/useMetrics';

interface Campaign {
  id: number;
  name: string;
}

export default function CampaignAnalysisPage() {
  const t = useTranslations('campaignAnalysis');
  const { getInitialDateRange, isLoading: settingsLoading } = useSystemSettings();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'chart' | 'table' | 'utm'>('chart');

  // Initialize after system settings load to avoid double-fetch
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const MAX_RANGE_DAYS = 90;

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

  // Quick date range selection
  const setQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    const rawStart = start.toISOString().split('T')[0];
    const rawEnd = end.toISOString().split('T')[0];
    const { start: finalStart, end: finalEnd, clamped } = clampDateRange(rawStart, rawEnd);

    if (clamped) {
      toast.info(t('filters.limitedToMaxDays', { days: MAX_RANGE_DAYS }));
    }

    setDateRange({
      start: finalStart,
      end: finalEnd
    });
  };

  // Fetch campaigns list on mount
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetchWithAuth('/api/campaigns');
        const result = await response.json();
        if (result.campaigns && result.campaigns.length > 0) {
          setCampaigns(result.campaigns);
          setSelectedCampaign(result.campaigns[0].id.toString());
        }
      } catch (err) {
        console.error('Error fetching campaigns:', err);
      }
    };

    fetchCampaigns();
  }, []);

  // Get metrics data (lifted to parent to prevent duplicate fetches)
  const { data: metricsData, loading: metricsLoading, error: metricsError } = useCampaignMetrics({
    campaignId: selectedCampaign,
    platform: selectedPlatform,
    startDate: dateRange?.start || '',
    endDate: dateRange?.end || '',
    enabled: !!selectedCampaign && !!dateRange && !settingsLoading,
  });

  // Platform badge colors
  const platformColors: Record<string, string> = {
    naver: 'bg-green-100 text-green-800',
    kakao: 'bg-yellow-100 text-yellow-800',
    google: 'bg-red-100 text-red-800',
    youtube: 'bg-blue-100 text-blue-800',
    facebook: 'bg-indigo-100 text-indigo-800',
    instagram: 'bg-pink-100 text-pink-800',
  };

  const getPlatformBadgeColor = (platform: string) => {
    return platformColors[platform.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  // Filter platforms based on selection
  const displayedPlatforms = metricsData?.platforms || [];
  const filteredPlatforms = selectedPlatform === 'all'
    ? displayedPlatforms
    : displayedPlatforms.filter(p => p.toLowerCase() === selectedPlatform.toLowerCase());

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

      {/* Date Range Picker - Top (matching Performance Dashboard layout) */}
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
                    toast.info(t('filters.limitedToMaxDays', { days: MAX_RANGE_DAYS }));
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
                    toast.info(t('filters.limitedToMaxDays', { days: MAX_RANGE_DAYS }));
                  }
                  setDateRange({ start, end });
                }
              }}
              maxRangeDays={MAX_RANGE_DAYS}
              onRangeClamped={() => {
                toast.info(t('filters.limitedToMaxDays', { days: MAX_RANGE_DAYS }));
              }}
            />
          )}

          {/* Right: Quick Range Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setQuickRange(7)}
              className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              {t('filters.last7Days')}
            </button>
            <button
              onClick={() => setQuickRange(30)}
              className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              {t('filters.last30Days')}
            </button>
            <button
              onClick={() => setQuickRange(90)}
              className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              {t('filters.last3Months')}
            </button>
          </div>
        </div>
      </div>

      {/* Campaign Selector */}
      <div className="mb-4 sm:mb-6 bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">{t('selectCampaign')}</label>
        <select
          value={selectedCampaign}
          onChange={(e) => setSelectedCampaign(e.target.value)}
          className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {campaigns.length === 0 && <option value="">{t('noCampaigns')}</option>}
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </select>

        {/* Campaign Info with Platform Badges */}
        {metricsData && (
          <div className="mt-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">{metricsData.campaign.name}</h3>
              <p className="text-xs sm:text-sm text-gray-600">{metricsData.campaign.course_name || t('noCourseLinked')}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {filteredPlatforms.map((platform, idx) => (
                  <span key={idx} className={`px-2 py-1 rounded text-xs font-medium ${getPlatformBadgeColor(platform)}`}>
                    {platform}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-left lg:text-right">
              <p className="text-xs sm:text-sm text-gray-600">{t('budget')}</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">₩{(metricsData.campaign.budget / 10000).toFixed(0)}만</p>
              <p className="text-xs text-gray-500">{t('spent')}: ₩{(metricsData.campaign.spent / 10000).toFixed(0)}만</p>
            </div>
          </div>
        )}
      </div>

      {/* View Mode Toggle and Platform Filter */}
      <div className={`mb-4 sm:mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 ${viewMode !== 'utm' ? 'justify-between' : 'justify-end'}`}>
        {/* Platform Filter - Hidden for UTM Comparison view */}
        {viewMode !== 'utm' && (
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm bg-white"
          >
            <option value="all">{t('filters.allPlatforms')}</option>
            {displayedPlatforms.map((platform, idx) => (
              <option key={idx} value={platform.toLowerCase()}>{platform}</option>
            ))}
          </select>
        )}

        {/* View Mode Toggle */}
        <div className="flex gap-2 bg-white p-1 rounded-lg shadow-sm border border-gray-200">
          <button
            onClick={() => setViewMode('chart')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${viewMode === 'chart'
              ? 'bg-blue-600 text-white'
              : 'bg-transparent text-gray-700 hover:bg-gray-100'
              }`}
          >
            {t('viewMode.chart')}
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${viewMode === 'table'
              ? 'bg-blue-600 text-white'
              : 'bg-transparent text-gray-700 hover:bg-gray-100'
              }`}
          >
            {t('viewMode.table')}
          </button>
          <button
            onClick={() => setViewMode('utm')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${viewMode === 'utm'
              ? 'bg-blue-600 text-white'
              : 'bg-transparent text-gray-700 hover:bg-gray-100'
              }`}
          >
            {t('viewMode.utm')}
          </button>
        </div>
      </div>

      {/* Data Display */}
      {selectedCampaign && dateRange && !settingsLoading && (
        <div data-export-content>
          {/* Tier 1: Metrics Section (Always Load) */}
          <MetricsSection
            metricsData={metricsData}
            loading={metricsLoading}
            error={metricsError}
            viewMode={viewMode}
          />

          {/* Tier 2: UTM Breakdown Section (Only when UTM view mode is selected) */}
          {viewMode === 'utm' && (
            <UTMBreakdownSection
              campaignId={selectedCampaign}
              platform={selectedPlatform}
              startDate={dateRange.start}
              endDate={dateRange.end}
              deletedLinksCount={metricsData?.deletedLinksCount}
              enabled={true}
            />
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-8">
        <PageFooter />
      </div>
    </div>
  );
}
