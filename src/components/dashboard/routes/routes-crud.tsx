"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { MoveRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RouteDeleteDialog } from "./route-delete-dialog";
import { CityCombobox } from "./city-combobox";
import { useRoutesStore } from "@/hooks/use-routes-store";
import { useUnitTypes } from "@/hooks/use-unit-types";
import { parseCityValue } from "@/lib/data/mexico-cities";
import { formatMxn } from "@/lib/utils";
import { fuzzyMatch } from "@/lib/search";
import { ROUTE_STATUS_LABELS } from "@/lib/constants/route-status";
import type { Route, RouteStatus } from "@/types/route.types";
import { ROUTE_STATUS_OPTIONS } from "@/lib/constants/route-status";

const STATUS_FILTER_ALL = "all";
const UNIT_FILTER_ALL = "all";

export function RoutesCrud() {
  const { routes, deleteRoute: removeRoute, isLoaded, error } = useRoutesStore();
  const unitTypes = useUnitTypes();
  const unitTypeLabel = useMemo(
    () => Object.fromEntries(unitTypes.map((u) => [u.value, u.label])),
    [unitTypes]
  );
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
      if (originCity && !fuzzyMatch(route.origin, originCity)) return false;
      if (destCity && !fuzzyMatch(route.destination, destCity)) return false;
      if (status != null && route.status !== status) return false;
      if (filterUnitType !== UNIT_FILTER_ALL && route.unitType !== filterUnitType) return false;
      return true;
    });
  }, [routes, filterOrigin, filterDestination, filterStatus, filterUnitType]);

  const groupedRoutes = useMemo(() => {
    const map = new Map<string, Route[]>();
    for (const r of filteredRoutes) {
      const group = map.get(r.origin) ?? [];
      group.push(r);
      map.set(r.origin, group);
    }
    return Array.from(map.entries()).map(([origin, items]) => ({ origin, items }));
  }, [filteredRoutes]);

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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
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
                  {unitTypes.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span aria-hidden className="invisible block text-sm font-medium leading-none">_</span>
              <Button
                type="button"
                variant="outline"
                className="w-full"
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

          {filteredRoutes.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
              No hay rutas con esos filtros.
            </p>
          ) : (
            <div className="space-y-4">
              {groupedRoutes.map(({ origin, items }) => (
                <div key={origin} className="overflow-x-auto rounded-lg border">
                  <div className="border-b bg-muted/60 px-4 py-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Desde {origin}
                    </span>
                  </div>
                  <table className="w-full min-w-[680px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/20 text-xs font-medium text-muted-foreground">
                        <th className="px-4 py-1.5 text-left font-medium">Ruta</th>
                        <th className="px-4 py-1.5 text-left font-medium">Estado</th>
                        <th className="px-4 py-1.5 text-left font-medium">Tipo</th>
                        <th className="px-4 py-1.5 text-left font-medium">Descripción</th>
                        <th className="px-4 py-1.5 text-left font-medium">Target (MXN)</th>
                        <th className="px-4 py-1.5 text-left font-medium">Estatus</th>
                        <th className="px-4 py-1.5 text-left font-medium">Creado por</th>
                        <th className="px-4 py-1.5 text-right font-medium">
                          <span className="sr-only">Acciones</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((route) => {
                        const description = route.description?.trim() ?? "";
                        return (
                          <tr
                            key={route.id}
                            className="border-b last:border-b-0 transition-colors hover:bg-hover hover:text-hover-foreground"
                          >
                            <td className="px-4 py-3">
                              <p className="flex items-center gap-1 font-medium">
                                <span className="truncate">{route.origin}</span>
                                <MoveRight className="size-3.5 shrink-0 text-muted-foreground" />
                                <span className="truncate">{route.destination}</span>
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              {route.destinationState ?? (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {unitTypeLabel[route.unitType] ?? route.unitType}
                            </td>
                            <td className="px-4 py-3">
                              {description ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="block max-w-[140px] cursor-default truncate sm:max-w-[200px]">
                                      {description}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs whitespace-pre-wrap">
                                    {description}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {route.target != null ? (
                                `$${formatMxn(route.target)}`
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {ROUTE_STATUS_LABELS[route.status]}
                            </td>
                            <td className="px-4 py-3">
                              {route.createdByName ?? (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" asChild aria-label="Editar ruta">
                                  <Link href={`/admin/dashboard/routes/${route.id}/edit`}>
                                    <Pencil className="size-4" />
                                  </Link>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openDelete(route)}
                                  aria-label="Eliminar ruta"
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
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
