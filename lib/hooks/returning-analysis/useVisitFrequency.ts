import { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';

interface FrequencyBucket {
  label: string;
  min: number;
  max: number;
  users: number;
}

interface UseReturningAnalysisVisitFrequencyParams {
  startDate: string;
  endDate: string;
  enabled: boolean;
}

export function useReturningAnalysisVisitFrequency({
  startDate,
  endDate,
  enabled,
}: UseReturningAnalysisVisitFrequencyParams) {
  const hasFetchedRef = useRef(false);
  const paramsRef = useRef<string>('');
  const [data, setData] = useState<FrequencyBucket[]>([]);
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
      console.log('visit-frequency');
      hasFetchedRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          start_date: startDate,
          end_date: endDate,
        });

        const response = await fetchWithAuth(`/api/analytics/returning-analysis/visit-frequency?${params}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch visit frequency data');
        }

        setData(result.visitFrequency);
      } catch (err) {
        console.error('Error fetching visit frequency data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load visit frequency data');
        hasFetchedRef.current = false;
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [enabled, startDate, endDate]);

  return { data, loading, error };
}

