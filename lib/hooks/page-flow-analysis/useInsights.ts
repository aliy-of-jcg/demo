import { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';

interface InsightsData {
  totalSessions: number;
  totalPageviews: number;
  avgPageviewsPerSession: string;
  uniqueLandingPagesCount: number;
  avgSessionDepth: string;
}

interface UsePageFlowInsightsParams {
  startDate: string;
  endDate: string;
  limit: number;
  search?: string;
  domain?: string;
  enabled: boolean;
}

export function usePageFlowInsights({
  startDate,
  endDate,
  limit,
  search,
  domain,
  enabled,
}: UsePageFlowInsightsParams) {
  const hasFetchedRef = useRef(false);
  const paramsRef = useRef<string>('');
  const [data, setData] = useState<InsightsData | null>(null);
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
      console.log('summary');
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

        const response = await fetchWithAuth(`/api/analytics/page-flow-analysis/insights?${params}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch insights data');
        }

        setData(result.insights);
      } catch (err) {
        console.error('Error fetching page flow insights:', err);
        setError(err instanceof Error ? err.message : 'Failed to load insights');
        hasFetchedRef.current = false; // Allow retry on error
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [enabled, startDate, endDate, limit, search, domain]);

  return { data, loading, error };
}

