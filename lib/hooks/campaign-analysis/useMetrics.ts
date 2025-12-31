import { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';

interface CampaignData {
  id: number;
  name: string;
  course_name: string;
  budget: number;
  spent: number;
}

interface MetricsData {
  visitors: number;
  conversions: number;
  conversionRate: string;
  clicks: number;
  ctr: string;
  revenue: number;
  cpa: number;
}

interface DailyData {
  date: string;
  visitors: number;
  conversions: number;
  conversionRate: string;
  cost: number;
}

interface UseCampaignMetricsParams {
  campaignId: string;
  platform: string;
  startDate: string;
  endDate: string;
  enabled: boolean;
}

interface CampaignMetricsResponse {
  campaign: CampaignData;
  platforms: string[];
  metrics: MetricsData;
  dailyData: DailyData[];
  hasLegacyData: boolean;
  clicksFromLegacyData: number;
  deletedLinksCount: number;
}

export function useCampaignMetrics({
  campaignId,
  platform,
  startDate,
  endDate,
  enabled,
}: UseCampaignMetricsParams) {
  const hasFetchedRef = useRef(false);
  const paramsRef = useRef<string>('');
  const [data, setData] = useState<CampaignMetricsResponse | null>(null);
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
      console.log('metrics');
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

        const response = await fetchWithAuth(`/api/analytics/campaign-analysis/metrics?${params}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch metrics data');
        }

        setData(result);
      } catch (err) {
        console.error('Error fetching campaign metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load metrics');
        hasFetchedRef.current = false;
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [enabled, campaignId, platform, startDate, endDate]);

  return { data, loading, error };
}

