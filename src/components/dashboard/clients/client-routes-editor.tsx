"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Route as RouteIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUnitTypes } from "@/hooks/use-unit-types";
import { ROUTE_STATUS_LABELS } from "@/lib/constants/route-status";
import { formatMxnLive, parseMxn, formatMxn } from "@/lib/utils";
import { toast } from "sonner";
import {
  type AssignedRoute,
  ROUTE_STATUS_VARIANT,
  clientRoutesEndpoint,
  groupByUnitType,
} from "./client-routes";

/**
 * Estado de la tabla de tarifa/volumen por ruta en la edición de un cliente.
 * Lo usan la página de admin y la del colaborador para no tener dos copias.
 */
export function useClientRoutesEditor(clientId: string | undefined) {
  const [routes, setRoutes] = useState<AssignedRoute[]>([]);
  const [routesLoaded, setRoutesLoaded] = useState(false);
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [volumes, setVolumes] = useState<Record<string, string>>({});

  const reload = useCallback(() => {
    if (!clientId) return;
    fetch(`${clientRoutesEndpoint(clientId)}?idsOnly=false`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: AssignedRoute[]) => {
        setRoutes(data);
        const t: Record<string, string> = {};
        const v: Record<string, string> = {};
        for (const r of data) {
          if (r.clientTarget != null) t[r.clientRouteId] = formatMxn(r.clientTarget);
          if (r.clientWeeklyVolume != null) v[r.clientRouteId] = String(r.clientWeeklyVolume);
        }
        setTargets(t);
        setVolumes(v);
        setRoutesLoaded(true);
      })
      .catch(() => setRoutesLoaded(true));
  }, [clientId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const setTarget = useCallback((clientRouteId: string, value: string) => {
    setTargets((prev) => ({ ...prev, [clientRouteId]: formatMxnLive(value) }));
  }, []);
  const setVolume = useCallback((clientRouteId: string, value: string) => {
    setVolumes((prev) => ({ ...prev, [clientRouteId]: value }));
  }, []);

  /** Guarda tarifa y volumen de cada ruta. Avisa con un toast si algo falló. */
  const saveTargets = useCallback(async () => {
    if (!clientId) return;
    const updates = routes.map((route) => {
      const rawTarget = targets[route.clientRouteId]?.trim();
      const rawVolume = volumes[route.clientRouteId]?.trim();
      const parsedTarget = rawTarget ? parseMxn(rawTarget) : null;
      const parsedVolume = rawVolume ? Math.round(Number(rawVolume)) : null;
      return fetch(clientRoutesEndpoint(clientId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientRouteId: route.clientRouteId,
          target: parsedTarget != null && !isNaN(parsedTarget) ? parsedTarget : null,
          weeklyVolume: parsedVolume != null && !isNaN(parsedVolume) ? parsedVolume : null,
        }),
      });
    });
    try {
      const results = await Promise.all(updates);
      if (!results.every((r) => r.ok)) toast.error("No se pudieron guardar algunas tarifas.");
    } catch {
      toast.error("No se pudieron guardar las tarifas.");
    }
  }, [clientId, routes, targets, volumes]);

  return { routes, routesLoaded, targets, volumes, setTarget, setVolume, reload, saveTargets };
}

type Editor = ReturnType<typeof useClientRoutesEditor>;

/** Tarjeta con la tarifa y el volumen semanal de cada ruta asignada. */
export function ClientRoutesEditorCard({ editor }: { editor: Editor }) {
  const { routes, routesLoaded, targets, volumes, setTarget, setVolume } = editor;
  const unitTypes = useUnitTypes();
  const unitTypeLabel = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ut of unitTypes) map[ut.value] = ut.label;
    return map;
  }, [unitTypes]);

  if (!routesLoaded || routes.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Tarifas y volumen por ruta ({routes.length})
        </CardTitle>
        <RouteIcon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="space-y-0">
          {groupByUnitType(routes).map(([ut, items]) => (
            <div key={ut}>
              <div className="border-b bg-muted/60 px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {unitTypeLabel[ut] ?? ut}
                </span>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-140">
                  <div className="grid grid-cols-[1fr_minmax(120px,1fr)_minmax(100px,1fr)_minmax(80px,1fr)] gap-x-6 border-b bg-muted/20 px-4 py-1.5 text-xs font-medium text-muted-foreground">
                    <span>Ruta</span>
                    <span>Tarifa</span>
                    <span>Vol/sem</span>
                    <span>Estado</span>
                  </div>
                  {items.map((route) => (
                    <div
                      key={route.clientRouteId}
                      className="grid grid-cols-[1fr_minmax(120px,1fr)_minmax(100px,1fr)_minmax(80px,1fr)] gap-x-6 items-center border-b px-4 py-3 last:border-0 transition-colors hover:bg-blue-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {route.origin} → {route.destination}
                        </p>
                        {route.destinationState && (
                          <p className="text-muted-foreground text-xs truncate">{route.destinationState}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground text-xs shrink-0">$</span>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={targets[route.clientRouteId] ?? ""}
                          onChange={(e) => setTarget(route.clientRouteId, e.target.value)}
                          className="h-7 w-28 text-xs"
                          aria-label={`Tarifa ${route.origin} → ${route.destination}`}
                        />
                      </div>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={volumes[route.clientRouteId] ?? ""}
                        onChange={(e) => setVolume(route.clientRouteId, e.target.value)}
                        className="h-7 w-20 text-xs"
                        aria-label={`Volumen semanal ${route.origin} → ${route.destination}`}
                      />
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
      </CardContent>
    </Card>
  );
}
