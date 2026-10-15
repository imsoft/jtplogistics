"use client";

import { useMemo } from "react";
import { Route as RouteIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardListSkeleton } from "@/components/ui/skeletons";
import { useUnitTypes } from "@/hooks/use-unit-types";
import { ROUTE_STATUS_LABELS } from "@/lib/constants/route-status";
import { formatMxn } from "@/lib/utils";
import { type AssignedRoute, ROUTE_STATUS_VARIANT, groupByUnitType } from "./client-routes";

/** Tarjeta de solo lectura con las rutas asignadas a un cliente (perfil). */
export function ClientAssignedRoutesCard({
  routes,
  loaded,
  canAssign,
}: {
  routes: AssignedRoute[];
  loaded: boolean;
  /** Si quien mira puede asignar rutas, el vacío le dice cómo. */
  canAssign: boolean;
}) {
  const unitTypes = useUnitTypes();
  const unitTypeLabel = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ut of unitTypes) map[ut.value] = ut.label;
    return map;
  }, [unitTypes]);

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Rutas asignadas {loaded && `(${routes.length})`}
        </CardTitle>
        <RouteIcon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {!loaded ? (
          <CardListSkeleton cards={2} lines={1} className="px-4 pb-4" />
        ) : routes.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed mx-4 mb-4 p-4 text-center text-sm">
            {canAssign
              ? 'No hay rutas asignadas. Usa el botón "Seleccionar rutas" para asignarlas.'
              : "No hay rutas asignadas."}
          </p>
        ) : (
          <div className="space-y-0">
            {groupByUnitType(routes).map(([ut, items]) => (
              <div key={ut}>
                <div className="border-b bg-muted/60 px-4 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {unitTypeLabel[ut] ?? ut}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <div className="min-w-165">
                    <div className="grid grid-cols-[1fr_minmax(100px,1fr)_minmax(100px,1fr)_minmax(120px,1fr)_minmax(80px,1fr)] gap-x-6 border-b bg-muted/20 px-4 py-1.5 text-xs font-medium text-muted-foreground">
                      <span>Ruta</span>
                      <span>Tarifa</span>
                      <span>Vol/sem</span>
                      <span>Creado por</span>
                      <span>Estado</span>
                    </div>
                    {items.map((route) => (
                      <div
                        key={route.clientRouteId}
                        className="grid grid-cols-[1fr_minmax(100px,1fr)_minmax(100px,1fr)_minmax(120px,1fr)_minmax(80px,1fr)] gap-x-6 items-center border-b px-4 py-3 last:border-0 transition-colors hover:bg-blue-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {route.origin} → {route.destination}
                          </p>
                          {route.destinationState && (
                            <p className="text-muted-foreground text-xs truncate">{route.destinationState}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {route.target != null ? `$${formatMxn(route.target)}` : "—"}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {route.weeklyVolume != null ? route.weeklyVolume : "—"}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap truncate">
                          {route.createdByName ?? "—"}
                        </span>
                        <Badge variant={ROUTE_STATUS_VARIANT[route.status] ?? "outline"} className="text-xs">
                          {ROUTE_STATUS_LABELS[route.status as keyof typeof ROUTE_STATUS_LABELS] ?? route.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
