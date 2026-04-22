"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCarrierQuotesColumns } from "./carrier-quotes-columns";
import type { ActiveRoute, CarrierQuote, CarrierQuotesResponse } from "@/types/carrier-quote.types";
import { formatMxn } from "@/lib/utils";
import { fuzzyMatch } from "@/lib/search";

async function fetchQuotes(routeId?: string): Promise<CarrierQuotesResponse> {
  const url = routeId
    ? `/api/admin/carrier-quotes?routeId=${routeId}`
    : "/api/admin/carrier-quotes";
  const res = await fetch(url);
  if (!res.ok) return { routes: [], carriers: [] };
  return res.json();
}

function computeStats(quotes: CarrierQuote[]) {
  const targets = quotes
    .map((q) => q.carrierTarget)
    .filter((t): t is number => t != null && !Number.isNaN(t));
  if (targets.length === 0) return { avg: null, venta: null, monto: null };
  const avg = targets.reduce((a, b) => a + b, 0) / targets.length;
  const venta = avg * 1.30;
  const monto = venta * 1.16;
  return { avg, venta, monto };
}

export function CarrierQuotesTable() {
  const [routes, setRoutes] = useState<ActiveRoute[]>([]);
  const [carriers, setCarriers] = useState<CarrierQuote[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadingCarriers, setIsLoadingCarriers] = useState(false);

  const [selectedOrigin, setSelectedOrigin] = useState<string>("");
  const [selectedDestination, setSelectedDestination] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [filterPrice, setFilterPrice] = useState<string>("all");

  // Load routes on mount
  const loadRoutes = useCallback(async () => {
    const data = await fetchQuotes();
    setRoutes(data.routes);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  // Unique origins
  const origins = useMemo(
    () => Array.from(new Set(routes.map((r) => r.origin))).sort(),
    [routes]
  );

  // Destinations filtered by selected origin
  const destinations = useMemo(
    () =>
      routes
        .filter((r) => r.origin === selectedOrigin)
        .map((r) => r.destination)
        .sort(),
    [routes, selectedOrigin]
  );

  // Selected route
  const selectedRoute = useMemo(
    () =>
      routes.find(
        (r) => r.origin === selectedOrigin && r.destination === selectedDestination
      ) ?? null,
    [routes, selectedOrigin, selectedDestination]
  );
  const selectedRouteId = selectedRoute?.id ?? null;
  const routeTarget = selectedRoute?.target ?? null;

  // Load carriers when route changes
  useEffect(() => {
    if (!selectedRouteId) {
      setCarriers([]);
      return;
    }
    setIsLoadingCarriers(true);
    fetchQuotes(selectedRouteId).then((data) => {
      setCarriers(data.carriers);
      setIsLoadingCarriers(false);
    });
  }, [selectedRouteId]);

  function handleOriginChange(value: string) {
    setSelectedOrigin(value);
    setSelectedDestination("");
    setCarriers([]);
    setSearch("");
    setFilterPrice("all");
  }

  const columns = useMemo(() => getCarrierQuotesColumns(routeTarget), [routeTarget]);
  const stats = useMemo(() => computeStats(carriers), [carriers]);

  const filteredCarriers = useMemo(() => {
    let result = carriers;
    const q = search.trim();
    if (q) {
      result = result.filter(
        (c) =>
          fuzzyMatch(c.name, q) ||
          fuzzyMatch(c.email, q) ||
          fuzzyMatch(c.company ?? "", q)
      );
    }
    if (filterPrice !== "all" && routeTarget != null) {
      result = result.filter((c) => {
        if (c.carrierTarget == null) return false;
        if (filterPrice === "below") return c.carrierTarget < routeTarget;
        if (filterPrice === "above") return c.carrierTarget > routeTarget;
        return true;
      });
    }
    return result;
  }, [carriers, search, filterPrice, routeTarget]);

  if (!isLoaded) {
    return <p className="text-muted-foreground">Cargando…</p>;
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        <div className="space-y-2">
          <Label className="text-xs font-medium">Origen</Label>
          <Select value={selectedOrigin} onValueChange={handleOriginChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
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
              <SelectValue />
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

        <div className="space-y-2">
          <Label className="text-xs font-medium">Buscar</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={!selectedRouteId}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Target vs. ruta</Label>
          <Select value={filterPrice} onValueChange={setFilterPrice} disabled={!selectedRouteId || routeTarget == null}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="below">Por debajo del target</SelectItem>
              <SelectItem value="above">Por encima del target</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="self-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              handleOriginChange("");
              setSelectedDestination("");
              setSearch("");
              setFilterPrice("all");
            }}
          >
            Limpiar filtros
          </Button>
        </div>
      </div>

      {/* Resultados */}
      {!selectedRouteId ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          Selecciona una ruta para ver los transportistas disponibles.
        </p>
      ) : isLoadingCarriers ? (
        <p className="text-muted-foreground">Cargando transportistas…</p>
      ) : carriers.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          Ningún transportista ha seleccionado esta ruta todavía.
        </p>
      ) : (
        <div className="space-y-4">
          <DataTable<CarrierQuote, unknown>
            columns={columns}
            data={filteredCarriers}
            getRowId={(row) => row.id}
            filterColumn=""
          />

          {stats.avg != null && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Resumen de targets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-muted-foreground text-xs font-medium">Promedio</p>
                    <p className="text-lg font-semibold">${formatMxn(stats.avg)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-muted-foreground text-xs font-medium">Venta</p>
                    <p className="text-lg font-semibold">${formatMxn(stats.venta)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-muted-foreground text-xs font-medium">Total con IVA</p>
                    <p className="text-lg font-semibold">${formatMxn(stats.monto)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
