import { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';

interface ExitPageData {
  page: string;
  exits: number;
  exitRate: number;
}

interface UsePageFlowExitPagesParams {
  startDate: string;
  endDate: string;
  limit: number;
  search?: string;
  domain?: string;
  enabled: boolean;
}

export function usePageFlowExitPages({
  startDate,
  endDate,
  limit,
  search,
  domain,
  enabled,
}: UsePageFlowExitPagesParams) {
  const hasFetchedRef = useRef(false);
  const [data, setData] = useState<ExitPageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || hasFetchedRef.current || !startDate || !endDate) {
      return;
    }

    const fetchData = async () => {
      console.log('exit');
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

        const response = await fetchWithAuth(`/api/analytics/page-flow-analysis/exit-pages?${params}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch exit pages data');
        }

        setData(result.exitPages || []);
      } catch (err) {
        console.error('Error fetching exit pages:', err);
        setError(err instanceof Error ? err.message : 'Failed to load exit pages');
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

