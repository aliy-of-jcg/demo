import { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';

interface UTMBreakdown {
  utm_source: string;
  total_sessions: number;
  total_pageviews: number;
  avg_pageviews_per_session: number;
}

interface UsePageFlowUTMParams {
  startDate: string;
  endDate: string;
  limit: number;
  search?: string;
  domain?: string;
  enabled: boolean;
}

export function usePageFlowUTM({
  startDate,
  endDate,
  limit,
  search,
  domain,
  enabled,
}: UsePageFlowUTMParams) {
  const hasFetchedRef = useRef(false);
  const paramsRef = useRef<string>('');
  const [data, setData] = useState<UTMBreakdown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !startDate || !endDate) {
      return;
    }

    // Create a unique key for current params
    const paramsKey = `${startDate}-${endDate}-${limit}-${search || ''}-${domain || ''}`;
    
    // Reset guard only if params actually changed
    if (paramsRef.current !== paramsKey) {
      hasFetchedRef.current = false;
      paramsRef.current = paramsKey;
    }

    if (hasFetchedRef.current) {
      return;
    }

    const fetchData = async () => {
      console.log('utm');
      hasFetchedRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          start_date: startDate,
          end_date: endDate,
          limit: limit.toString(),
        });

        if (domain) {
          params.set('domain', domain);
        }

        if (search) {
          params.set('search', search);
        }

        const response = await fetchWithAuth(`/api/analytics/page-flow-analysis/utm?${params}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch UTM data');
        }

        setData(result.utmBreakdown || []);
      } catch (err) {
        console.error('Error fetching UTM breakdown:', err);
        setError(err instanceof Error ? err.message : 'Failed to load UTM data');
        hasFetchedRef.current = false; // Allow retry on error
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [enabled, startDate, endDate, limit, search, domain]);

  return { data, loading, error };
}

