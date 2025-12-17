import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';

interface Website {
  domain: string;
}

interface TrackedWebsitesResponse {
  success: boolean;
  websites: Website[];
}

interface UseTrackedWebsitesParams {
  startDate: string;
  endDate: string;
  enabled?: boolean;
}

export function useTrackedWebsites({
  startDate,
  endDate,
  enabled = true,
}: UseTrackedWebsitesParams) {
  return useQuery<Website[]>({
    queryKey: ['trackedWebsites', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        start: startDate,
        end: endDate,
      });

      const response = await fetchWithAuth(`/api/analytics/tracked-websites?${params}`);
      const result: TrackedWebsitesResponse = await response.json();

      if (!result.success || !result.websites) {
        throw new Error('Failed to fetch domains');
      }

      return result.websites;
    },
    enabled: enabled && !!startDate && !!endDate,
    // Stale time: 2 minutes (domains don't change frequently)
    staleTime: 2 * 60 * 1000,
    // Cache time: 10 minutes
    gcTime: 10 * 60 * 1000,
  });
}

