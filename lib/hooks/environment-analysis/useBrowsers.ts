import { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';

interface BrowserItem {
  browser: string;
  visitors: number;
  pageviews: number;
  conversions: number;
  conversionRate: string;
}

interface UseEnvironmentBrowsersParams {
  startDate: string;
  endDate: string;
  enabled: boolean;
}

export function useEnvironmentBrowsers({
  startDate,
  endDate,
  enabled,
}: UseEnvironmentBrowsersParams) {
  const hasFetchedRef = useRef(false);
  const paramsRef = useRef<string>('');
  const [data, setData] = useState<BrowserItem[] | null>(null);
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
      console.log('browsers');
      hasFetchedRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          start_date: startDate,
          end_date: endDate,
        });

        const response = await fetchWithAuth(`/api/analytics/environment-analysis/browsers?${params}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch browsers data');
        }

        setData(result.browsers);
      } catch (err) {
        console.error('Error fetching environment browsers:', err);
        setError(err instanceof Error ? err.message : 'Failed to load browsers');
        hasFetchedRef.current = false;
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [enabled, startDate, endDate]);

  return { data, loading, error };
}

