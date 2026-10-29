"use client";

import { useState, useEffect, useCallback } from "react";

interface UseAdminFetchResult<T> {
  data: T[];
  isLoaded: boolean;
  error: string | null;
  /** Vuelve a pedir los datos (p. ej. después de eliminar). */
  reload: () => void;
}

export function useAdminFetch<T>(
  endpoint: string,
  errorMessage: string
): UseAdminFetchResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  // El error se guarda junto con la petición a la que pertenece: al cambiar
  // de endpoint deja de mostrarse sin tener que limpiarlo en el efecto.
  const requestKey = `${endpoint}\n${errorMessage}`;
  const [errorState, setErrorState] = useState<{ key: string; message: string } | null>(null);
  const error = errorState?.key === requestKey ? errorState.message : null;

  // Los setState van en los callbacks de la promesa, no en el cuerpo del efecto.
  const fetchData = useCallback(() => {
    const key = `${endpoint}\n${errorMessage}`;
    return fetch(endpoint)
      .then(async (res) => {
        if (!res.ok) throw new Error(errorMessage);
        setData(await res.json());
        setErrorState(null);
      })
      .catch((e) => {
        setErrorState({ key, message: e instanceof Error ? e.message : errorMessage });
      })
      .finally(() => {
        setIsLoaded(true);
      });
  }, [endpoint, errorMessage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const reload = useCallback(() => {
    setErrorState(null);
    fetchData();
  }, [fetchData]);

  return { data, isLoaded, error, reload };
}
