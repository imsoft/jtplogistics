"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { RouteDeleteDialog } from "./route-delete-dialog";
import { CityCombobox } from "./city-combobox";
import { getRoutesColumns } from "./routes-columns";
import { useRoutesStore } from "@/hooks/use-routes-store";
import { parseCityValue } from "@/lib/data/mexico-cities";
import type { Route, RouteStatus } from "@/types/route.types";
import { ROUTE_STATUS_OPTIONS } from "@/lib/constants/route-status";

const STATUS_FILTER_ALL = "all";
const UNIT_FILTER_ALL = "all";

export function RoutesCrud() {
  const { routes, deleteRoute: removeRoute, isLoaded, error } = useRoutesStore();
  const [deleteRoute, setDeleteRoute] = useState<Route | null>(null);
  const [filterOrigin, setFilterOrigin] = useState<string | null>(null);
  const [filterDestination, setFilterDestination] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>(STATUS_FILTER_ALL);
  const [filterUnitType, setFilterUnitType] = useState<string>(UNIT_FILTER_ALL);

  const openDelete = useCallback((route: Route) => {
    setDeleteRoute(route);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteRoute) {
      const ok = await removeRoute(deleteRoute.id);
      if (ok) setDeleteRoute(null);
    }
  }, [deleteRoute, removeRoute]);

  const filteredRoutes = useMemo(() => {
    const status = filterStatus === STATUS_FILTER_ALL ? null : (filterStatus as RouteStatus);
    const originCity = parseCityValue(filterOrigin).city;
    const destCity = parseCityValue(filterDestination).city;
    return routes.filter((route) => {
      if (originCity && !route.origin.toLowerCase().includes(originCity.toLowerCase())) return false;
      if (destCity && !route.destination.toLowerCase().includes(destCity.toLowerCase())) return false;
      if (status != null && route.status !== status) return false;
      if (filterUnitType !== UNIT_FILTER_ALL && route.unitType !== filterUnitType) return false;
      return true;
    });
  }, [routes, filterOrigin, filterDestination, filterStatus, filterUnitType]);

  const columns = useMemo(
    () => getRoutesColumns({ onDelete: openDelete }),
    [openDelete]
  );

  if (!isLoaded) {
    return <p className="text-muted-foreground">Cargando…</p>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {routes.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          No hay rutas. Haz clic en &quot;Nueva ruta&quot; para crear una.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <CityCombobox
              id="filter-origin"
              label="Origen"
              value={filterOrigin}
              onValueChange={setFilterOrigin}
            />
            <CityCombobox
              id="filter-destination"
              label="Destino"
              value={filterDestination}
              onValueChange={setFilterDestination}
            />
            <div className="space-y-2">
              <Label htmlFor="filter-status">Estado</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="filter-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={STATUS_FILTER_ALL}>Todos</SelectItem>
                  {ROUTE_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-unit">Tipo de unidad</Label>
              <Select value={filterUnitType} onValueChange={setFilterUnitType}>
                <SelectTrigger id="filter-unit" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNIT_FILTER_ALL}>Todos</SelectItem>
                  <SelectItem value="dry_box">Caja seca</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span aria-hidden className="invisible block text-sm font-medium leading-none">_</span>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFilterOrigin(null);
                  setFilterDestination(null);
                  setFilterStatus(STATUS_FILTER_ALL);
                  setFilterUnitType(UNIT_FILTER_ALL);
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          </div>

          <DataTable<Route, unknown>
            columns={columns}
            data={filteredRoutes}
            filterColumn=""
            initialColumnVisibility={{ search: false }}
            getRowId={(row) => row.id}
          />
        </>
      )}

      <RouteDeleteDialog
        open={deleteRoute !== null}
        onOpenChange={(open) => !open && setDeleteRoute(null)}
        route={deleteRoute}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
