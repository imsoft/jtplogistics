"use client";

import { useState, useCallback, useEffect } from "react";
import type { Route, RouteFormData } from "@/types/route.types";

async function fetchRoutes(): Promise<Route[]> {
  const res = await fetch("/api/routes");
  if (!res.ok) {
    if (res.status === 401) return [];
    throw new Error("Error al cargar rutas");
  }
  return res.json();
}

export function useRoutesStore() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRoutes = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchRoutes();
      setRoutes(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar las rutas");
      setRoutes([]);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  const addRoute = useCallback(
    async (data: RouteFormData): Promise<Route | null> => {
      setError(null);
      try {
        const res = await fetch("/api/routes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: data.origin.trim(),
            destination: data.destination.trim(),
            destinationState: data.destinationState?.trim() || undefined,
            description: data.description?.trim() || undefined,
            target: data.target,
            weeklyVolume: data.weeklyVolume,
            unitType: data.unitType,
            status: data.status,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Error al crear la ruta");
        }
        const route = await res.json();
        setRoutes((prev) => [route, ...prev]);
        return route;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al crear la ruta");
        return null;
      }
    },
    []
  );

  const updateRoute = useCallback(
    async (id: string, data: RouteFormData): Promise<boolean> => {
      setError(null);
      try {
        const res = await fetch(`/api/routes/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: data.origin.trim(),
            destination: data.destination.trim(),
            destinationState: data.destinationState?.trim() || undefined,
            description: data.description?.trim() || undefined,
            target: data.target,
            weeklyVolume: data.weeklyVolume,
            unitType: data.unitType,
            status: data.status,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Error al actualizar la ruta");
        }
        const updated = await res.json();
        setRoutes((prev) => prev.map((r) => (r.id === id ? updated : r)));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al actualizar la ruta");
        return false;
      }
    },
    []
  );

  const deleteRoute = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch(`/api/routes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al eliminar la ruta");
      }
      setRoutes((prev) => prev.filter((r) => r.id !== id));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar la ruta");
      return false;
    }
  }, []);

  const getRouteById = useCallback(
    (id: string): Route | undefined => routes.find((r) => r.id === id),
    [routes]
  );

  return {
    routes,
    isLoaded,
    error,
    refetch: loadRoutes,
    addRoute,
    updateRoute,
    deleteRoute,
    getRouteById,
  };
}
