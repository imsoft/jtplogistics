"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
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
import { formatMxnLive, formatMxn, parseMxn } from "@/lib/utils";
import { useUnitTypes } from "@/hooks/use-unit-types";
import { toast } from "sonner";

interface CarrierRouteRow {
  id: string;
  origin: string;
  destination: string;
  description: string | null;
  unitType: string;
  jtpTarget: number | null;
  selected: boolean;
  carrierTarget: number | null;
  carrierWeeklyVolume: number | null;
  createdAt: string;
}

interface CarrierRoutesResponse {
  canEditTarget: boolean;
  canEditRoutes: boolean;
  routes: CarrierRouteRow[];
}

async function fetchCarrierRoutes(): Promise<CarrierRoutesResponse> {
  const res = await fetch("/api/carrier/routes");
  if (!res.ok) return { canEditTarget: false, canEditRoutes: false, routes: [] };
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

export default function CarrierUnitTypesPage() {
  const [routes, setRoutes] = useState<CarrierRouteRow[]>([]);
  const [canEditTarget, setCanEditTarget] = useState(false);
  const [canEditRoutes, setCanEditRoutes] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [activeUnitTypes, setActiveUnitTypes] = useState<Set<string>>(new Set());
  const [filterOrigin, setFilterOrigin] = useState<string | null>(null);
  const [filterDestination, setFilterDestination] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [originalSelected, setOriginalSelected] = useState<Set<string>>(new Set());
  const [targetByRouteId, setTargetByRouteId] = useState<Record<string, string>>({});
  const [weeklyVolumeByRouteId, setWeeklyVolumeByRouteId] = useState<Record<string, string>>({});

  const unitTypes = useUnitTypes();

  const loadRoutes = useCallback(async () => {
    const data = await fetchCarrierRoutes();
    setCanEditTarget(data.canEditTarget);
    setCanEditRoutes(data.canEditRoutes);
    setRoutes(data.routes);

    const savedSelected = new Set<string>();
    const savedTargets: Record<string, string> = {};
    const savedVolumes: Record<string, string> = {};
    for (const r of data.routes) {
      if (r.selected) savedSelected.add(r.id);
      if (r.carrierTarget != null) savedTargets[r.id] = formatMxn(r.carrierTarget);
      if (r.carrierWeeklyVolume != null) savedVolumes[r.id] = String(r.carrierWeeklyVolume);
    }
    setSelected(savedSelected);
    setOriginalSelected(savedSelected);
    setTargetByRouteId(savedTargets);
    setWeeklyVolumeByRouteId(savedVolumes);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  // Rutas filtradas por tipos de unidad seleccionados
  const routesByUnitType = useMemo(() => {
    if (activeUnitTypes.size === 0) return routes;
    return routes.filter((r) => activeUnitTypes.has(r.unitType));
  }, [routes, activeUnitTypes]);

  const origins = useMemo(
    () => [...new Set(routesByUnitType.map((r) => r.origin))].sort(),
    [routesByUnitType]
  );

  const destinations = useMemo(() => {
    const base = filterOrigin
      ? routesByUnitType.filter((r) => r.origin === filterOrigin)
      : routesByUnitType;
    return [...new Set(base.map((r) => r.destination))].sort();
  }, [routesByUnitType, filterOrigin]);

  const filteredRoutes = useMemo(() => {
    return routesByUnitType.filter((r) => {
      if (filterOrigin && r.origin !== filterOrigin) return false;
      if (filterDestination && r.destination !== filterDestination) return false;
      return true;
    });
  }, [routesByUnitType, filterOrigin, filterDestination]);

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

  // Cuántos tipos de unidad tienen rutas disponibles
  const unitTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of routes) {
      counts[r.unitType] = (counts[r.unitType] ?? 0) + 1;
    }
    return counts;
  }, [routes]);

  function toggleUnitType(value: string) {
    setActiveUnitTypes((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
    setFilterOrigin(null);
    setFilterDestination(null);
  }

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
      const body = Array.from(selected).map((routeId) => {
        const rawVolume = weeklyVolumeByRouteId[routeId]?.trim();
        const parsedVolume = rawVolume ? Math.round(Number(rawVolume)) : null;
        return {
          routeId,
          carrierTarget: parseMxn(targetByRouteId[routeId] ?? "") ?? null,
          carrierWeeklyVolume: rawVolume && !isNaN(parsedVolume as number) ? parsedVolume : null,
        };
      });

      const res = await fetch("/api/carrier/routes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Error al guardar");
      toast.success("Selecciones guardadas correctamente.");
      await loadRoutes();
    } catch {
      toast.error("No se pudieron guardar las selecciones. Intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isLoaded) {
    return <p className="text-muted-foreground">Cargando…</p>;
  }

  const canSave = canEditRoutes || newSelections.size > 0;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Tipos de unidades</h1>
        <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
          Filtra las rutas disponibles por tipo de unidad y establece tu target.
        </p>
      </div>

      {!canEditTarget && isLoaded && (
        <p className="text-xs text-muted-foreground">
          La edición de tu target está deshabilitada. Contacta al administrador.
        </p>
      )}
      {!canEditRoutes && isLoaded && (
        <p className="text-xs text-muted-foreground">
          Las rutas ya guardadas están bloqueadas. Puedes agregar nuevas rutas. Contacta al administrador para modificar las existentes.
        </p>
      )}

      {routes.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          No hay rutas disponibles por el momento.
        </p>
      ) : (
        <>
          {/* Filtro multi-selección por tipo de unidad */}
          <div className="flex flex-wrap gap-2">
            {unitTypes
              .filter((ut) => (unitTypeCounts[ut.value] ?? 0) > 0)
              .map((ut) => {
                const isActive = activeUnitTypes.has(ut.value);
                return (
                  <button
                    key={ut.value}
                    type="button"
                    onClick={() => toggleUnitType(ut.value)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    {ut.label}
                    <span className="ml-1.5 tabular-nums opacity-70">
                      ({unitTypeCounts[ut.value] ?? 0})
                    </span>
                  </button>
                );
              })}
            {activeUnitTypes.size > 0 && (
              <button
                type="button"
                onClick={() => {
                  setActiveUnitTypes(new Set());
                  setFilterOrigin(null);
                  setFilterDestination(null);
                }}
                className="rounded-full border border-input bg-background px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
              >
                Limpiar tipos
              </button>
            )}
          </div>

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
                      const isLocked = isOriginallySelected && !canEditRoutes;
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
                            <TargetDiff jtpTarget={route.jtpTarget} carrierTarget={currentTarget} />
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
                {selected.size} ruta{selected.size !== 1 ? "s" : ""} seleccionada
                {selected.size !== 1 ? "s" : ""}
                {!canEditRoutes && newSelections.size > 0 && (
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
