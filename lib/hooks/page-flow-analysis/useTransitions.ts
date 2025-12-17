import { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';

interface PageTransition {
  from: string;
  to: string;
  count: number;
}

interface UsePageFlowTransitionsParams {
  startDate: string;
  endDate: string;
  limit: number;
  search?: string;
  domain?: string;
  enabled: boolean;
}

export function usePageFlowTransitions({
  startDate,
  endDate,
  limit,
  search,
  domain,
  enabled,
}: UsePageFlowTransitionsParams) {
  const hasFetchedRef = useRef(false);
  const [data, setData] = useState<PageTransition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || hasFetchedRef.current || !startDate || !endDate) {
      return;
    }

    const fetchData = async () => {
      console.log('page transition');
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

        const response = await fetchWithAuth(`/api/analytics/page-flow-analysis/transitions?${params}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch transitions data');
        }

        setData(result.pageTransitions || []);
      } catch (err) {
        console.error('Error fetching page transitions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load transitions');
        hasFetchedRef.current = false; // Allow retry on error
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [enabled, startDate, endDate, limit, search, domain]);

  // Reset fetch guard when query parameters change (not when enabled changes)
  useEffect(() => {
    hasFetchedRef.current = false;
  }, [startDate, endDate, limit, search, domain]);

  return { data, loading, error };
}

