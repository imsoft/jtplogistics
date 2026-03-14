"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMxn } from "@/lib/utils";

type ActiveRoute = { id: string; origin: string; destination: string; target: number | null };

async function fetchRoutes(): Promise<{ routes: ActiveRoute[] }> {
  const res = await fetch("/api/vendor/carrier-quotes");
  if (!res.ok) return { routes: [] };
  return res.json();
}

async function fetchTargets(routeId: string): Promise<{ targets: number[] }> {
  const res = await fetch(`/api/vendor/carrier-quotes?routeId=${routeId}`);
  if (!res.ok) return { targets: [] };
  return res.json();
}

function computeStats(targets: number[]) {
  if (targets.length === 0) return null;
  const avg = targets.reduce((a, b) => a + b, 0) / targets.length;
  const venta = avg * 1.25;
  const monto = venta * 1.16;
  const comision = monto * 0.03;
  return { avg, venta, monto, comision };
}

export function VendorQuotesTable() {
  const [routes, setRoutes] = useState<ActiveRoute[]>([]);
  const [targets, setTargets] = useState<number[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);

  const [selectedOrigin, setSelectedOrigin] = useState<string>("");
  const [selectedDestination, setSelectedDestination] = useState<string>("");

  const loadRoutes = useCallback(async () => {
    const data = await fetchRoutes();
    setRoutes(data.routes);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  const origins = useMemo(
    () => Array.from(new Set(routes.map((r) => r.origin))).sort(),
    [routes]
  );

  const destinations = useMemo(
    () =>
      routes
        .filter((r) => r.origin === selectedOrigin)
        .map((r) => r.destination)
        .sort(),
    [routes, selectedOrigin]
  );

  const selectedRouteId = useMemo(
    () =>
      routes.find(
        (r) => r.origin === selectedOrigin && r.destination === selectedDestination
      )?.id ?? null,
    [routes, selectedOrigin, selectedDestination]
  );

  useEffect(() => {
    if (!selectedRouteId) {
      setTargets([]);
      return;
    }
    setIsLoadingTargets(true);
    fetchTargets(selectedRouteId).then((data) => {
      setTargets(data.targets ?? []);
      setIsLoadingTargets(false);
    });
  }, [selectedRouteId]);

  function handleOriginChange(value: string) {
    setSelectedOrigin(value);
    setSelectedDestination("");
    setTargets([]);
  }

  const stats = useMemo(() => computeStats(targets), [targets]);

  if (!isLoaded) {
    return <p className="text-muted-foreground">Cargando…</p>;
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs font-medium">Origen</Label>
          <Select value={selectedOrigin} onValueChange={handleOriginChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="" />
            </SelectTrigger>
            <SelectContent>
              {origins.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Destino</Label>
          <Select
            value={selectedDestination}
            onValueChange={setSelectedDestination}
            disabled={!selectedOrigin}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="" />
            </SelectTrigger>
            <SelectContent>
              {destinations.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Resultados */}
      {!selectedRouteId ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          Selecciona una ruta para ver el resumen.
        </p>
      ) : isLoadingTargets ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : stats === null ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          No hay datos disponibles para esta ruta.
        </p>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Resumen de targets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-muted-foreground text-xs font-medium">Venta</p>
                <p className="text-lg font-semibold">${formatMxn(stats.venta)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-muted-foreground text-xs font-medium">Total con IVA</p>
                <p className="text-lg font-semibold">${formatMxn(stats.monto)}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-4">
                <p className="text-muted-foreground text-xs font-medium">Comisión</p>
                <p className="text-lg font-semibold text-primary">${formatMxn(stats.comision)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
