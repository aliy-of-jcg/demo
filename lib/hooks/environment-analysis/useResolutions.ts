import { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';

interface ResolutionItem {
  resolution: string;
  visitors: number;
  pageviews: number;
}

interface UseEnvironmentResolutionsParams {
  startDate: string;
  endDate: string;
  enabled: boolean;
}

export function useEnvironmentResolutions({
  startDate,
  endDate,
  enabled,
}: UseEnvironmentResolutionsParams) {
  const hasFetchedRef = useRef(false);
  const paramsRef = useRef<string>('');
  const [data, setData] = useState<ResolutionItem[] | null>(null);
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
      console.log('resolutions');
      hasFetchedRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          start_date: startDate,
          end_date: endDate,
        });

        const response = await fetchWithAuth(`/api/analytics/environment-analysis/resolutions?${params}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch resolutions data');
        }

        setData(result.resolutions);
      } catch (err) {
        console.error('Error fetching environment resolutions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load resolutions');
        hasFetchedRef.current = false;
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [enabled, startDate, endDate]);

  return { data, loading, error };
}

