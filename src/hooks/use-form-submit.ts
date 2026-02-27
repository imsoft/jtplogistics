"use client";

import { useState, useCallback } from "react";

export interface UseFormSubmitState {
  isLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  submit: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
}

export function useFormSubmit(): UseFormSubmitState {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async <T>(fn: () => Promise<T>) => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await fn();
      return result;
    } catch {
      setError("Algo salió mal. Intenta de nuevo.");
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, setError, submit };
}
