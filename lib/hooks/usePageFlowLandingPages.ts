import { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';

interface PageData {
  page: string;
  visits: number;
  avgPageviews: number;
  bounceRate: number;
  avgTimeOnPage: number;
}

interface UsePageFlowLandingPagesParams {
  startDate: string;
  endDate: string;
  limit: number;
  search?: string;
  domain?: string;
  enabled: boolean;
}

export function usePageFlowLandingPages({
  startDate,
  endDate,
  limit,
  search,
  domain,
  enabled,
}: UsePageFlowLandingPagesParams) {
  const hasFetchedRef = useRef(false);
  const [data, setData] = useState<PageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || hasFetchedRef.current || !startDate || !endDate) {
      return;
    }

    const fetchData = async () => {
      console.log('landing');
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

        const response = await fetchWithAuth(`/api/analytics/page-flow-analysis/landing-pages?${params}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch landing pages data');
        }

        setData(result.landingPages || []);
      } catch (err) {
        console.error('Error fetching landing pages:', err);
        setError(err instanceof Error ? err.message : 'Failed to load landing pages');
        hasFetchedRef.current = false; // Allow retry on error
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [enabled, startDate, endDate, limit, search, domain]);

  // Reset fetch guard when key dependencies change
  useEffect(() => {
    hasFetchedRef.current = false;
  }, [startDate, endDate, limit, search, domain]);

  return { data, loading, error };
}

