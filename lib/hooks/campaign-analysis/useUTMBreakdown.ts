import { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';

interface UtmMetrics {
  clicks: number;
  visitors: number;
  conversions: number;
  conversionRate: string;
  ctr: string;
}

interface UtmDailyData {
  date: string;
  visitors: number;
  conversions: number;
  conversionRate: string;
}

interface UtmBreakdownItem {
  id: number;
  name: string;
  tracking_code: string;
  utm_source: string;
  utm_medium: string;
  utm_content: string;
  status: string;
  budget: number;
  spent: number;
  landingPageTracked?: boolean;
  metrics: UtmMetrics;
  dailyData: UtmDailyData[];
}

interface UseCampaignUTMBreakdownParams {
  campaignId: string;
  platform: string;
  startDate: string;
  endDate: string;
  enabled: boolean;
}

interface CampaignUTMBreakdownResponse {
  utmBreakdown: UtmBreakdownItem[];
  nonLegacyMetrics: {
    visitors: number;
    conversions: number;
    conversionRate: string;
    clicks: number;
    ctr: string;
  };
}

export function useCampaignUTMBreakdown({
  campaignId,
  platform,
  startDate,
  endDate,
  enabled,
}: UseCampaignUTMBreakdownParams) {
  const hasFetchedRef = useRef(false);
  const paramsRef = useRef<string>('');
  const [data, setData] = useState<CampaignUTMBreakdownResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !campaignId || !startDate || !endDate) {
      return;
    }

    const paramsKey = `${campaignId}-${platform}-${startDate}-${endDate}`;
    
    if (paramsRef.current !== paramsKey) {
      hasFetchedRef.current = false;
      paramsRef.current = paramsKey;
    }

    if (hasFetchedRef.current) {
      return;
    }

    const fetchData = async () => {
      console.log('utm-breakdown');
      hasFetchedRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          campaign_id: campaignId,
          platform: platform,
          start_date: startDate,
          end_date: endDate,
        });

        const response = await fetchWithAuth(`/api/analytics/campaign-analysis/utm-breakdown?${params}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch UTM breakdown data');
        }

        setData(result);
      } catch (err) {
        console.error('Error fetching campaign UTM breakdown:', err);
        setError(err instanceof Error ? err.message : 'Failed to load UTM breakdown');
        hasFetchedRef.current = false;
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [enabled, campaignId, platform, startDate, endDate]);

  return { data, loading, error };
}

