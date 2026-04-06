"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { Check, Minus, MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMxnLive, formatMxn, parseMxn } from "@/lib/utils";
import { useUnitTypes } from "@/hooks/use-unit-types";
import { toast } from "sonner";

interface RouteSelection {
  unitType: string;
  carrierTarget: number | null;
  carrierWeeklyVolume: number | null;
}

interface CarrierRouteRow {
  id: string;
  origin: string;
  destination: string;
  description: string | null;
  unitType: string;
  /** Targets por tipo de unidad (una sola ruta puede tener varios). */
  unitTargets: { unitType: string; target: number | null }[];
  jtpTarget: number | null;
  selected: boolean;
  selections: RouteSelection[];
  carrierTarget: number | null;
  carrierWeeklyVolume: number | null;
  createdAt: string;
}

interface CarrierRoutesResponse {
  canEditTarget: boolean;
  canEditRoutes: boolean;
  canAddRoutes: boolean;
  routes: CarrierRouteRow[];
}

async function fetchCarrierRoutes(): Promise<CarrierRoutesResponse> {
  const res = await fetch("/api/carrier/routes");
  if (!res.ok) return { canEditTarget: false, canEditRoutes: false, canAddRoutes: false, routes: [] };
  return res.json();
}

function TargetDiff({
  jtpTarget,
  carrierTarget,
}: {
  jtpTarget: number | null;
  carrierTarget: number | null;
}) {
  if (jtpTarget == null || carrierTarget == null) return null;
  const diff = ((carrierTarget - jtpTarget) / jtpTarget) * 100;
  const abs = Math.abs(diff).toFixed(1);
  if (Math.abs(diff) < 0.05) {
    return <Minus className="size-4 text-muted-foreground" />;
  }
  if (diff > 0) {
    return <span className="text-xs font-medium text-destructive">+{abs}%</span>;
  }
  return <Check className="size-4 text-green-600 dark:text-green-400" />;
}

export default function CarrierUnitTypePage() {
  const { unitType } = useParams<{ unitType: string }>();
  const [allRoutes, setAllRoutes] = useState<CarrierRouteRow[]>([]);
  const [canEditTarget, setCanEditTarget] = useState(false);
  const [canEditRoutes, setCanEditRoutes] = useState(false);
  const [canAddRoutes, setCanAddRoutes] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRequestingEditUnlock, setIsRequestingEditUnlock] = useState(false);
  const [isRequestingAddUnlock, setIsRequestingAddUnlock] = useState(false);

  const [filterOrigin, setFilterOrigin] = useState<string | null>(null);
  const [filterDestination, setFilterDestination] = useState<string | null>(null);

  // Selection state for THIS unit type page only
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [originalSelected, setOriginalSelected] = useState<Set<string>>(new Set());
  const [targetByRouteId, setTargetByRouteId] = useState<Record<string, string>>({});
  const [weeklyVolumeByRouteId, setWeeklyVolumeByRouteId] = useState<Record<string, string>>({});

  const unitTypes = useUnitTypes();
  const unitTypeLabel = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ut of unitTypes) map[ut.value] = ut.label;
    return map;
  }, [unitTypes]);

  const pageTitle = unitTypeLabel[unitType] ?? unitType;

  const hasAnySelectionGlobally = useMemo(
    () => allRoutes.some((r) => r.selections.length > 0),
    [allRoutes]
  );

  const loadRoutes = useCallback(async () => {
    const data = await fetchCarrierRoutes();
    setCanEditTarget(data.canEditTarget);
    setCanEditRoutes(data.canEditRoutes);
    setCanAddRoutes(data.canAddRoutes);
    setAllRoutes(data.routes);

    // Load selections for the current unitType page
    const savedSelected = new Set<string>();
    const savedTargets: Record<string, string> = {};
    const savedVolumes: Record<string, string> = {};
    for (const r of data.routes) {
      const sel = r.selections?.find((s) => s.unitType === unitType);
      if (sel) {
        savedSelected.add(r.id);
        if (sel.carrierTarget != null) savedTargets[r.id] = formatMxn(sel.carrierTarget);
        if (sel.carrierWeeklyVolume != null) savedVolumes[r.id] = String(sel.carrierWeeklyVolume);
      }
    }
    setSelected(savedSelected);
    setOriginalSelected(savedSelected);
    setTargetByRouteId(savedTargets);
    setWeeklyVolumeByRouteId(savedVolumes);
    setIsLoaded(true);
  }, [unitType]);

  useEffect(() => {
    setIsLoaded(false);
    loadRoutes();
  }, [loadRoutes]);

  // Rutas que incluyen este tipo de unidad (perfil de la ruta, no filas duplicadas)
  const routes = useMemo(
    () =>
      allRoutes.filter((route) =>
        route.unitTargets?.some((t) => t.unitType === unitType) ?? route.unitType === unitType
      ),
    [allRoutes, unitType]
  );

  const jtpTargetForPage = useCallback(
    (route: CarrierRouteRow): number | null => {
      const fromList = route.unitTargets?.find((t) => t.unitType === unitType);
      if (fromList && fromList.target != null) return fromList.target;
      if (route.unitType === unitType && route.jtpTarget != null) return route.jtpTarget;
      return null;
    },
    [unitType]
  );

  const origins = useMemo(
    () => [...new Set(routes.map((r) => r.origin))].sort(),
    [routes]
  );

  const destinations = useMemo(() => {
    const base = filterOrigin
      ? routes.filter((r) => r.origin === filterOrigin)
      : routes;
    return [...new Set(base.map((r) => r.destination))].sort();
  }, [routes, filterOrigin]);

  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      if (filterOrigin && r.origin !== filterOrigin) return false;
      if (filterDestination && r.destination !== filterDestination) return false;
      return true;
    });
  }, [routes, filterOrigin, filterDestination]);

  // Group by origin
  const groupedRoutes = useMemo(() => {
    const map = new Map<string, CarrierRouteRow[]>();
    for (const r of filteredRoutes) {
      const group = map.get(r.origin) ?? [];
      group.push(r);
      map.set(r.origin, group);
    }
    return Array.from(map.entries()).map(([origin, items]) => ({ origin, items }));
  }, [filteredRoutes]);

  const newSelections = useMemo(
    () => new Set([...selected].filter((id) => !originalSelected.has(id))),
    [selected, originalSelected]
  );

  // Fully locked: carrier already saved and admin hasn't re-enabled editing
  const isFullyLocked = !canEditRoutes && originalSelected.size > 0;

  const selectedCount = selected.size;

  function toggleSelected(routeId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(routeId)) next.delete(routeId);
      else next.add(routeId);
      return next;
    });
  }

  function handleTargetChange(routeId: string, raw: string) {
    setTargetByRouteId((prev) => ({ ...prev, [routeId]: formatMxnLive(raw) }));
  }

  function handleTargetBlur(routeId: string) {
    const raw = targetByRouteId[routeId];
    if (raw == null) return;
    const parsed = parseMxn(raw);
    if (parsed != null) {
      setTargetByRouteId((prev) => ({ ...prev, [routeId]: formatMxn(parsed) }));
    }
  }

  function handleVolumeChange(routeId: string, value: string) {
    setWeeklyVolumeByRouteId((prev) => ({ ...prev, [routeId]: value }));
  }

  async function handleSubmit() {
    setIsSaving(true);
    try {
      // Only send selected routes for THIS unit type page
      const body = [...selected].map((routeId) => {
        const rawVolume = weeklyVolumeByRouteId[routeId]?.trim();
        const parsedVolume = rawVolume ? Math.round(Number(rawVolume)) : null;
        return {
          routeId,
          unitType,
          carrierTarget: parseMxn(targetByRouteId[routeId] ?? "") ?? null,
          carrierWeeklyVolume: rawVolume && !isNaN(parsedVolume as number) ? parsedVolume : null,
        };
      });

      const res = await fetch(`/api/carrier/routes?unitType=${encodeURIComponent(unitType)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al guardar");
      }
      toast.success(`Selecciones de ${pageTitle} guardadas correctamente.`);
      await loadRoutes();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudieron guardar las selecciones. Intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  }

  async function requestUnlock(type: "edit_existing" | "add_new") {
    if (type === "edit_existing") setIsRequestingEditUnlock(true);
    else setIsRequestingAddUnlock(true);
    try {
      const res = await fetch("/api/carrier/routes/unlock-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error("No se pudo enviar la solicitud");
      toast.success("Solicitud enviada al administrador.");
    } catch {
      toast.error("No se pudo enviar la solicitud. Intenta de nuevo.");
    } finally {
      if (type === "edit_existing") setIsRequestingEditUnlock(false);
      else setIsRequestingAddUnlock(false);
    }
  }

  if (!isLoaded) {
    return <p className="text-muted-foreground">Cargando…</p>;
  }

  const canSave = !isFullyLocked && (
    canEditRoutes
      ? (canAddRoutes || newSelections.size === 0)
      : (canAddRoutes && newSelections.size > 0)
  );

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{pageTitle}</h1>
        <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
          Selecciona las rutas que ofreces para <strong>{pageTitle}</strong> y establece tu target.
        </p>
      </div>

      {isLoaded && !hasAnySelectionGlobally && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="space-y-1 py-3 sm:py-4">
            <CardTitle className="text-base">Primer paso: tus rutas</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Marca las rutas que operas, completa tu target y volumen semanal, y guarda. Repite en cada
              tipo de unidad que manejes. Cuando termines, en <strong>Inicio</strong> verás el resumen de
              toda tu operación.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {isLoaded && (!canEditRoutes || !canAddRoutes) && (
        <div className="space-y-2 rounded-lg border p-3 sm:p-4">
          {!canEditRoutes && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                No puedes editar rutas ya seleccionadas ni su target hasta autorización del administrador.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => requestUnlock("edit_existing")}
                disabled={isRequestingEditUnlock}
                className="w-full sm:w-auto"
              >
                {isRequestingEditUnlock ? "Enviando…" : "Solicitar desbloqueo de edición"}
              </Button>
            </div>
          )}
          {!canAddRoutes && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                No puedes agregar rutas nuevas hasta autorización del administrador.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => requestUnlock("add_new")}
                disabled={isRequestingAddUnlock}
                className="w-full sm:w-auto"
              >
                {isRequestingAddUnlock ? "Enviando…" : "Solicitar desbloqueo para agregar"}
              </Button>
            </div>
          )}
        </div>
      )}

      {routes.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          No hay rutas disponibles por el momento.
        </p>
      ) : (
        <>
          {/* Filtros de origen/destino */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="filter-origin">Origen</Label>
              <Select
                value={filterOrigin ?? "__all__"}
                onValueChange={(v) => {
                  setFilterOrigin(v === "__all__" ? null : v);
                  setFilterDestination(null);
                }}
              >
                <SelectTrigger id="filter-origin" className="w-full">
                  <SelectValue placeholder="" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {origins.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-destination">Destino</Label>
              <Select
                value={filterDestination ?? "__all__"}
                onValueChange={(v) => setFilterDestination(v === "__all__" ? null : v)}
                disabled={origins.length === 0}
              >
                <SelectTrigger id="filter-destination" className="w-full">
                  <SelectValue placeholder="" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {destinations.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
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
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          </div>

          {/* Tabla agrupada por origen */}
          {filteredRoutes.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
              No hay rutas con esos filtros.
            </p>
          ) : (
            <div className="space-y-4">
              {groupedRoutes.map(({ origin, items }) => (
                <div key={origin} className="overflow-x-auto rounded-lg border">
                  <div className="min-w-[480px]">
                    <div className="border-b bg-muted/60 px-3 py-2 sm:px-4">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Desde {origin}
                      </span>
                    </div>
                    <div className="grid grid-cols-[auto_1fr_130px_80px_56px] gap-3 border-b bg-muted/20 px-3 py-1.5 text-xs font-medium text-muted-foreground sm:px-4">
                      <span className="flex items-center">Sel.</span>
                      <span className="flex items-center">Ruta</span>
                      <span className="flex items-center">Mi target</span>
                      <span className="flex items-center">Vol./sem.</span>
                      <span className="flex items-center">Dif.</span>
                    </div>
                    {items.map((route) => {
                      const isSelected = selected.has(route.id);
                      const isOriginallySelected = originalSelected.has(route.id);
                      const isLocked = isFullyLocked || (isOriginallySelected && !canEditRoutes);
                      const currentTarget = parseMxn(targetByRouteId[route.id] ?? "") ?? null;

                      return (
                        <div
                          key={route.id}
                          className="grid grid-cols-[auto_1fr_130px_80px_56px] gap-3 items-center border-b px-3 py-3 last:border-b-0 sm:px-4 hover:bg-hover hover:text-hover-foreground transition-colors"
                        >
                          <label className="flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelected(route.id)}
                              disabled={isLocked}
                              className="size-4 rounded border-input accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`Seleccionar ${route.origin} a ${route.destination}`}
                            />
                          </label>

                          <div className="min-w-0">
                            <p className="flex items-center gap-1 text-sm font-medium">
                              <span className="truncate">{route.origin}</span>
                              <MoveRight className="size-3.5 shrink-0 text-muted-foreground" />
                              <span className="truncate">{route.destination}</span>
                            </p>
                            {route.description && (
                              <p className="text-muted-foreground truncate text-xs">{route.description}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground text-sm shrink-0">$</span>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={targetByRouteId[route.id] ?? ""}
                              onChange={(e) => handleTargetChange(route.id, e.target.value)}
                              onBlur={() => handleTargetBlur(route.id)}
                              disabled={!canEditTarget || !isSelected || isLocked}
                              className="h-8 min-w-0 w-full text-sm"
                              aria-label={`Mi target para ${route.origin} a ${route.destination}`}
                            />
                          </div>

                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={weeklyVolumeByRouteId[route.id] ?? ""}
                            onChange={(e) => handleVolumeChange(route.id, e.target.value)}
                            disabled={!isSelected || isLocked}
                            className="h-8 w-full text-sm"
                            aria-label={`Volumen semanal para ${route.origin} a ${route.destination}`}
                          />

                          <div className="flex items-center justify-center">
                            <TargetDiff jtpTarget={jtpTargetForPage(route)} carrierTarget={currentTarget} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-col gap-2 pt-2 sm:items-end">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-3">
              <span className="text-muted-foreground text-xs text-center sm:text-left">
                {selectedCount} ruta{selectedCount !== 1 ? "s" : ""} seleccionada
                {selectedCount !== 1 ? "s" : ""} para {pageTitle}
                {!isFullyLocked && !canEditRoutes && newSelections.size > 0 && (
                  <span className="ml-1">({newSelections.size} nueva{newSelections.size !== 1 ? "s" : ""})</span>
                )}
              </span>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving || !canSave}
                className="w-full sm:w-auto"
              >
                {isSaving ? "Guardando…" : "Guardar selección"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
