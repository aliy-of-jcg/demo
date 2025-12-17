import { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';

interface InsightsData {
  newVisitors: number;
  returningVisitors: number;
  totalVisitors: number;
  avgReturnInterval: number;
  newPercentage: string;
  returningPercentage: string;
}

interface UseReturningAnalysisInsightsParams {
  startDate: string;
  endDate: string;
  enabled: boolean;
}

export function useReturningAnalysisInsights({
  startDate,
  endDate,
  enabled,
}: UseReturningAnalysisInsightsParams) {
  const hasFetchedRef = useRef(false);
  const paramsRef = useRef<string>('');
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !startDate || !endDate) {
      return;
    }

    const paramsKey = `${startDate}-${endDate}`;
    
    if (paramsRef.current !== paramsKey) {
      hasFetchedRef.current = false;
      paramsRef.current = paramsKey;
    }

    if (hasFetchedRef.current) {
      return;
    }

    const fetchData = async () => {
      console.log('insights');
      hasFetchedRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          start_date: startDate,
          end_date: endDate,
        });

        const response = await fetchWithAuth(`/api/analytics/returning-analysis/insights?${params}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch insights data');
        }

        setData(result.insights);
      } catch (err) {
        console.error('Error fetching returning analysis insights:', err);
        setError(err instanceof Error ? err.message : 'Failed to load insights');
        hasFetchedRef.current = false;
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [enabled, startDate, endDate]);

  return { data, loading, error };
}

