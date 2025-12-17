import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';

interface PageData {
  page: string;
  visits: number;
  avgPageviews: number;
  bounceRate: number;
  avgTimeOnPage: number;
}

interface ExitPageData {
  page: string;
  exits: number;
  exitRate: number;
}

interface UTMBreakdown {
  utm_source: string;
  total_sessions: number;
  total_pageviews: number;
  avg_pageviews_per_session: number;
}

interface PageTransition {
  from: string;
  to: string;
  count: number;
}

export interface PageFlowAnalysisData {
  success: boolean;
  landingPages: PageData[];
  exitPages: ExitPageData[];
  utmBreakdown: UTMBreakdown[];
  pageTransitions?: PageTransition[];
  insights: {
    totalSessions: number;
    totalPageviews: number;
    avgPageviewsPerSession: string;
    uniqueLandingPagesCount: number;
    avgSessionDepth: string;
  };
}

interface UsePageFlowAnalysisParams {
  startDate: string;
  endDate: string;
  limit: number;
  search?: string;
  domain?: string;
  enabled?: boolean;
}

export function usePageFlowAnalysis({
  startDate,
  endDate,
  limit,
  search,
  domain,
  enabled = true,
}: UsePageFlowAnalysisParams) {
  return useQuery<PageFlowAnalysisData>({
    queryKey: ['pageFlowAnalysis', startDate, endDate, limit, search || '', domain || ''],
    queryFn: async () => {
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

      const response = await fetchWithAuth(`/api/analytics/page-flow-analysis?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      return result;
    },
    enabled: enabled && !!startDate && !!endDate,
    // Stale time: 30 seconds (matches server cache TTL)
    staleTime: 30 * 1000,
  });
}

