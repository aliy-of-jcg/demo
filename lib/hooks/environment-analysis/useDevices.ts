import { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';

interface DeviceItem {
  device: string;
  visitors: number;
  pageviews: number;
  conversions: number;
  conversionRate: string;
}

interface UseEnvironmentDevicesParams {
  startDate: string;
  endDate: string;
  enabled: boolean;
}

export function useEnvironmentDevices({
  startDate,
  endDate,
  enabled,
}: UseEnvironmentDevicesParams) {
  const hasFetchedRef = useRef(false);
  const paramsRef = useRef<string>('');
  const [data, setData] = useState<DeviceItem[] | null>(null);
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
      console.log('devices');
      hasFetchedRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          start_date: startDate,
          end_date: endDate,
        });

        const response = await fetchWithAuth(`/api/analytics/environment-analysis/devices?${params}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch devices data');
        }

        setData(result.devices);
      } catch (err) {
        console.error('Error fetching environment devices:', err);
        setError(err instanceof Error ? err.message : 'Failed to load devices');
        hasFetchedRef.current = false;
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [enabled, startDate, endDate]);

  return { data, loading, error };
}

