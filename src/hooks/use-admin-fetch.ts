"use client";

import { useState, useEffect, useCallback } from "react";

interface UseAdminFetchResult<T> {
  data: T[];
  isLoaded: boolean;
  error: string | null;
}

export function useAdminFetch<T>(
  endpoint: string,
  errorMessage: string
): UseAdminFetchResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(errorMessage);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : errorMessage);
    } finally {
      setIsLoaded(true);
    }
  }, [endpoint, errorMessage]);

  useEffect(() => { load(); }, [load]);

  return { data, isLoaded, error };
}
