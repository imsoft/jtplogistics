"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { SortingState, OnChangeFn } from "@tanstack/react-table";

interface ServerTablePage<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface UseServerTableOptions {
  /** Endpoint base (sin query string). */
  endpoint: string;
  /** Tamaño de página inicial (el usuario puede cambiarlo con setPageSize). */
  pageSize?: number;
  initialSorting?: SortingState;
  /**
   * Filtros adicionales (estado, rangos de fecha, etc.) serializados como query
   * params. Solo se incluyen los que tengan valor. Puede cambiar de identidad
   * en cada render sin causar refetch innecesario (se compara por contenido).
   */
  filters?: Record<string, string>;
  searchDebounceMs?: number;
  errorMessage?: string;
}

export interface UseServerTableResult<T> {
  data: T[];
  total: number;
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  setPageIndex: (index: number) => void;
  /** Cambia el número de filas por página y regresa a la primera página. */
  setPageSize: (size: number) => void;
  sorting: SortingState;
  setSorting: OnChangeFn<SortingState>;
  search: string;
  setSearch: (value: string) => void;
  /** true solo durante la primera carga. */
  isLoading: boolean;
  /** true durante cualquier petición en curso (incluye cambios de página). */
  isFetching: boolean;
  error: string | null;
  refetch: () => void;
  /** Construye la query actual (filtros + búsqueda + orden) más `extra`. */
  buildQuery: (extra?: Record<string, string>) => string;
}

/**
 * Maneja una tabla con paginación, orden, búsqueda y filtros del lado del
 * servidor. El endpoint debe aceptar `page`, `pageSize`, `q`, `sortBy`,
 * `sortDir` (+ los filtros) y responder `{ data, total, page, pageSize }`.
 */
export function useServerTable<T>({
  endpoint,
  pageSize: initialPageSize = 20,
  initialSorting = [],
  filters,
  searchDebounceMs = 350,
  errorMessage = "Error al cargar los datos",
}: UseServerTableOptions): UseServerTableResult<T> {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [sorting, setSortingState] = useState<SortingState>(initialSorting);
  const [search, setSearchState] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  // Acceso estable a los filtros sin meter su identidad en las dependencias.
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const filtersKey = JSON.stringify(filters ?? {});

  // Debounce de la búsqueda.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), searchDebounceMs);
    return () => clearTimeout(t);
  }, [search, searchDebounceMs]);

  // Al cambiar búsqueda, orden o filtros, volver a la primera página.
  useEffect(() => {
    setPageIndex(0);
  }, [debouncedSearch, filtersKey, sorting]);

  const buildQuery = useCallback(
    (extra?: Record<string, string>) => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (sorting[0]) {
        params.set("sortBy", sorting[0].id);
        params.set("sortDir", sorting[0].desc ? "desc" : "asc");
      }
      for (const [k, v] of Object.entries(filtersRef.current ?? {})) {
        if (v) params.set(k, v);
      }
      if (extra) {
        for (const [k, v] of Object.entries(extra)) {
          if (v) params.set(k, v);
        }
      }
      return params.toString();
      // filtersKey representa el contenido de filtersRef.current (estable por valor).
    },
    [debouncedSearch, sorting, filtersKey]
  );

  useEffect(() => {
    let cancelled = false;
    setIsFetching(true);
    setError(null);

    const qs = buildQuery({
      page: String(pageIndex + 1),
      pageSize: String(pageSize),
    });

    fetch(`${endpoint}?${qs}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(errorMessage);
        return (await res.json()) as ServerTablePage<T>;
      })
      .then((json) => {
        if (cancelled) return;
        setData(json.data);
        setTotal(json.total);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : errorMessage);
      })
      .finally(() => {
        if (!cancelled) {
          setIsFetching(false);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [endpoint, pageIndex, pageSize, buildQuery, reloadToken, errorMessage]);

  const setSorting = useCallback<OnChangeFn<SortingState>>((updater) => {
    setSortingState((prev) =>
      typeof updater === "function" ? updater(prev) : updater
    );
  }, []);

  const setSearch = useCallback((value: string) => setSearchState(value), []);
  const refetch = useCallback(() => setReloadToken((t) => t + 1), []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageIndex(0);
  }, []);

  return {
    data,
    total,
    pageIndex,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    setPageIndex,
    setPageSize,
    sorting,
    setSorting,
    search,
    setSearch,
    isLoading,
    isFetching,
    error,
    refetch,
    buildQuery,
  };
}
