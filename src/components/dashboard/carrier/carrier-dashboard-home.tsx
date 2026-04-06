"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Truck, Route } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { useUnitTypes } from "@/hooks/use-unit-types";
import { getCarrierHomeColumns } from "@/components/dashboard/carrier/carrier-home-columns";
import type { CarrierHomeRouteRow } from "@/types/carrier-home.types";

interface RouteSelection {
  unitType: string;
  carrierTarget: number | null;
  carrierWeeklyVolume: number | null;
}

interface CarrierRouteApi {
  id: string;
  origin: string;
  destination: string;
  description: string | null;
  unitTargets: { unitType: string; target: number | null }[];
  selections: RouteSelection[];
}

interface CarrierRoutesResponse {
  canEditTarget: boolean;
  canEditRoutes: boolean;
  canAddRoutes: boolean;
  routes: CarrierRouteApi[];
}

export function CarrierDashboardHome() {
  const unitTypes = useUnitTypes();
  const [data, setData] = useState<CarrierRoutesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/carrier/routes");
      if (!res.ok) throw new Error("No se pudieron cargar tus rutas.");
      const json = (await res.json()) as CarrierRoutesResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar las rutas.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unitLabelMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const u of unitTypes) m[u.value] = u.label;
    return m;
  }, [unitTypes]);

  const rows: CarrierHomeRouteRow[] = useMemo(() => {
    if (!data) return [];
    const out: CarrierHomeRouteRow[] = [];
    for (const r of data.routes) {
      for (const sel of r.selections) {
        const jtp =
          r.unitTargets.find((t) => t.unitType === sel.unitType)?.target ?? null;
        out.push({
          id: `${r.id}-${sel.unitType}`,
          routeId: r.id,
          origin: r.origin,
          destination: r.destination,
          description: r.description,
          unitType: sel.unitType,
          unitTypeLabel: unitLabelMap[sel.unitType] ?? sel.unitType,
          jtpTarget: jtp,
          carrierTarget: sel.carrierTarget,
          carrierWeeklyVolume: sel.carrierWeeklyVolume,
        });
      }
    }
    return out;
  }, [data, unitLabelMap]);

  const stats = useMemo(() => {
    const unitSet = new Set(rows.map((r) => r.unitType));
    const routeSet = new Set(rows.map((r) => r.routeId));
    return {
      operaciones: rows.length,
      tiposUnidad: unitSet.size,
      rutasDistintas: routeSet.size,
    };
  }, [rows]);

  const columns = useMemo(() => getCarrierHomeColumns(), []);

  if (!data) {
    return <p className="text-muted-foreground">Cargando tu panel…</p>;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="page-heading">Inicio</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
          Resumen de las rutas que ofreces y los targets que registraste.
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Route className="size-4 text-muted-foreground" />
              Operaciones
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Selecciones por tipo de unidad
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{stats.operaciones}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Truck className="size-4 text-muted-foreground" />
              Tipos de unidad
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              En tu portafolio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{stats.tiposUnidad}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rutas distintas</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Origen → destino
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{stats.rutasDistintas}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base sm:text-lg">Mis rutas</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {rows.length === 0
              ? "Aún no tienes selecciones guardadas."
              : "Detalle de cada combinación ruta y tipo de unidad."}
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 space-y-4">
          {rows.length === 0 ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground sm:text-sm">
                Ve a tus tipos de unidad para elegir rutas y guardar tu licitación.
              </p>
              <Button asChild className="w-full sm:w-auto">
                <Link href="/carrier/dashboard/unit-types">Seleccionar rutas</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <DataTable
                columns={columns}
                data={rows}
                filterColumn="search"
                filterPlaceholder="Buscar por ruta o tipo…"
                getRowId={(row) => row.id}
                initialColumnVisibility={{ search: false }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-dashed p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-sm font-medium">¿Quieres añadir o cambiar rutas?</p>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Edición según los permisos que te haya asignado el administrador.
          </p>
        </div>
        <Button variant="outline" asChild className="w-full shrink-0 sm:w-auto">
          <Link href="/carrier/dashboard/unit-types">Ir a tipos de unidad</Link>
        </Button>
      </div>
    </div>
  );
}
