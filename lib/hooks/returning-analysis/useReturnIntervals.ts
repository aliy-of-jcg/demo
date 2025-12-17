import { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';

interface IntervalBucket {
  label: string;
  min: number;
  max: number;
  users: number;
}

interface UseReturningAnalysisReturnIntervalsParams {
  startDate: string;
  endDate: string;
  enabled: boolean;
}

export function useReturningAnalysisReturnIntervals({
  startDate,
  endDate,
  enabled,
}: UseReturningAnalysisReturnIntervalsParams) {
  const hasFetchedRef = useRef(false);
  const paramsRef = useRef<string>('');
  const [data, setData] = useState<IntervalBucket[]>([]);
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
      console.log('return-intervals');
      hasFetchedRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          start_date: startDate,
          end_date: endDate,
        });

        const response = await fetchWithAuth(`/api/analytics/returning-analysis/return-intervals?${params}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch return intervals data');
        }

        setData(result.returnIntervals);
      } catch (err) {
        console.error('Error fetching return intervals data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load return intervals data');
        hasFetchedRef.current = false;
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [enabled, startDate, endDate]);

  return { data, loading, error };
}

