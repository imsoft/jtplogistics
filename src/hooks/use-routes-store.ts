"use client";

import { useState, useCallback, useEffect } from "react";
import type { Route, RouteFormData, RouteStatus } from "@/types/route.types";

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

  // Los setState van en los callbacks de la promesa, no en el cuerpo del efecto.
  const fetchAll = useCallback(
    () =>
      fetchRoutes()
        .then((data) => setRoutes(data))
        .catch((e) => {
          setError(e instanceof Error ? e.message : "Error al cargar las rutas");
          setRoutes([]);
        })
        .finally(() => setIsLoaded(true)),
    []
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const loadRoutes = useCallback(() => {
    setError(null);
    return fetchAll();
  }, [fetchAll]);

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
            unitTargets: data.unitTargets,
            status: data.status,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Error al crear la ruta");
        }
        const body = await res.json();
        const createdRoutes = Array.isArray(body.routes) ? body.routes : [body];
        setRoutes((prev) => [...createdRoutes, ...prev]);
        return createdRoutes[0] ?? null;
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
            unitTargets: data.unitTargets,
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

  /** Cambia solo el estatus (lo que puede hacer pricing). Devuelve el error o null. */
  const changeRouteStatus = useCallback(async (id: string, status: RouteStatus): Promise<string | null> => {
    const prev = routes;
    setRoutes((list) => list.map((r) => (r.id === id ? { ...r, status } : r)));
    const res = await fetch(`/api/routes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setRoutes(prev);
      return ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudo cambiar el estatus.";
    }
    const updated = await res.json();
    setRoutes((list) => list.map((r) => (r.id === id ? updated : r)));
    return null;
  }, [routes]);

  return {
    routes,
    isLoaded,
    error,
    refetch: loadRoutes,
    addRoute,
    updateRoute,
    changeRouteStatus,
    deleteRoute,
    getRouteById,
  };
}
