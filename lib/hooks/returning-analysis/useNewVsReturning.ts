import { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';

interface NewVsReturningData {
  new: {
    visitors: number;
    pageviews: number;
    conversions: number;
    conversionRate: string;
    avgTimeOnPage: number;
    percentage: string;
  };
  returning: {
    visitors: number;
    pageviews: number;
    conversions: number;
    conversionRate: string;
    avgTimeOnPage: number;
    percentage: string;
  };
}

interface UseReturningAnalysisNewVsReturningParams {
  startDate: string;
  endDate: string;
  enabled: boolean;
}

export function useReturningAnalysisNewVsReturning({
  startDate,
  endDate,
  enabled,
}: UseReturningAnalysisNewVsReturningParams) {
  const hasFetchedRef = useRef(false);
  const paramsRef = useRef<string>('');
  const [data, setData] = useState<NewVsReturningData | null>(null);
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
      console.log('new-vs-returning');
      hasFetchedRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          start_date: startDate,
          end_date: endDate,
        });

        const response = await fetchWithAuth(`/api/analytics/returning-analysis/new-vs-returning?${params}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch new vs returning data');
        }

        setData(result.newVsReturning);
      } catch (err) {
        console.error('Error fetching new vs returning data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load new vs returning data');
        hasFetchedRef.current = false;
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [enabled, startDate, endDate]);

  return { data, loading, error };
}

