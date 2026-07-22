"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import { formatMxn } from "@/lib/utils";

type ActiveRoute = {
  id: string;
  origin: string;
  destination: string;
  target: number | null;
  unitType: string;
};

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
  const [unitTypes, setUnitTypes] = useState<{ value: string; label: string }[]>([]);
  const [targets, setTargets] = useState<number[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);

  const [selectedUnitType, setSelectedUnitType] = useState<string>("");
  const [selectedOrigin, setSelectedOrigin] = useState<string>("");
  const [selectedDestination, setSelectedDestination] = useState<string>("");

  const loadRoutes = useCallback(async () => {
    const [data, utRes] = await Promise.all([
      fetchRoutes(),
      fetch("/api/unit-types").then((r) => (r.ok ? r.json() : [])),
    ]);
    setRoutes(data.routes);
    setUnitTypes(utRes);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  // Tipos de unidad disponibles según las rutas cargadas.
  const availableUnitTypes = useMemo(() => {
    const vals = Array.from(new Set(routes.map((r) => r.unitType)));
    return vals.map((v) => ({
      value: v,
      label: unitTypes.find((u) => u.value === v)?.label ?? v,
    }));
  }, [routes, unitTypes]);

  // Las rutas se filtran por el tipo de unidad que se va a cotizar.
  const filteredByUnit = useMemo(
    () => (selectedUnitType ? routes.filter((r) => r.unitType === selectedUnitType) : routes),
    [routes, selectedUnitType]
  );

  const origins = useMemo(
    () => Array.from(new Set(filteredByUnit.map((r) => r.origin))).sort(),
    [filteredByUnit]
  );

  const destinations = useMemo(
    () =>
      filteredByUnit
        .filter((r) => r.origin === selectedOrigin)
        .map((r) => r.destination)
        .sort(),
    [filteredByUnit, selectedOrigin]
  );

  const selectedRoute = useMemo(
    () =>
      filteredByUnit.find(
        (r) => r.origin === selectedOrigin && r.destination === selectedDestination
      ) ?? null,
    [filteredByUnit, selectedOrigin, selectedDestination]
  );
  const selectedRouteId = selectedRoute?.id ?? null;

  const selectedUnitLabel = useMemo(() => {
    if (!selectedRoute) return null;
    return (
      unitTypes.find((u) => u.value === selectedRoute.unitType)?.label ??
      selectedRoute.unitType
    );
  }, [selectedRoute, unitTypes]);

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

  function handleUnitTypeChange(value: string) {
    setSelectedUnitType(value);
    setSelectedOrigin("");
    setSelectedDestination("");
    setTargets([]);
  }

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label className="text-xs font-medium">Tipo de unidad</Label>
          <AppSelect
            value={selectedUnitType}
            onValueChange={handleUnitTypeChange}
            options={availableUnitTypes}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Origen</Label>
          <AppSelect
            value={selectedOrigin}
            onValueChange={handleOriginChange}
            options={origins.map((o) => ({value: o, label: o}))}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Destino</Label>
          <AppSelect
            value={selectedDestination}
            onValueChange={setSelectedDestination}
            options={destinations.map((d) => ({value: d, label: d}))}
            disabled={!selectedOrigin}
            className="w-full"
          />
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
            {selectedUnitLabel && (
              <p className="mb-4 text-xs text-muted-foreground">
                Tipo de unidad:{" "}
                <span className="font-medium text-foreground">{selectedUnitLabel}</span>
              </p>
            )}
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
