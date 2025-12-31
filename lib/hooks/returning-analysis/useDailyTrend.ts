import { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';

interface DailyTrendData {
  date: string;
  newVisitors: number;
  returningVisitors: number;
}

interface UseReturningAnalysisDailyTrendParams {
  startDate: string;
  endDate: string;
  enabled: boolean;
}

export function useReturningAnalysisDailyTrend({
  startDate,
  endDate,
  enabled,
}: UseReturningAnalysisDailyTrendParams) {
  const hasFetchedRef = useRef(false);
  const paramsRef = useRef<string>('');
  const [data, setData] = useState<DailyTrendData[]>([]);
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
      console.log('daily-trend');
      hasFetchedRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          start_date: startDate,
          end_date: endDate,
        });

        const response = await fetchWithAuth(`/api/analytics/returning-analysis/daily-trend?${params}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch daily trend data');
        }

        setData(result.dailyTrend);
      } catch (err) {
        console.error('Error fetching daily trend data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load daily trend data');
        hasFetchedRef.current = false;
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [enabled, startDate, endDate]);

  return { data, loading, error };
}

