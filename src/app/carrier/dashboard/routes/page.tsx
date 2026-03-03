"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CityCombobox } from "@/components/dashboard/routes/city-combobox";
import { formatMxnLive, formatMxn, parseMxn } from "@/lib/utils";

interface CarrierRouteRow {
  id: string;
  origin: string;
  destination: string;
  description: string | null;
  jtpTarget: number | null;
  selected: boolean;
  carrierTarget: number | null;
  createdAt: string;
}

interface CarrierRoutesResponse {
  canEditTarget: boolean;
  routes: CarrierRouteRow[];
}

async function fetchCarrierRoutes(): Promise<CarrierRoutesResponse> {
  const res = await fetch("/api/carrier/routes");
  if (!res.ok) return { canEditTarget: false, routes: [] };
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
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="size-3" /> 0%
      </span>
    );
  }
  if (diff > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-destructive">
        <TrendingUp className="size-3" /> +{abs}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-600 dark:text-green-400">
      <TrendingDown className="size-3" /> -{abs}%
    </span>
  );
}

export default function CarrierRoutesPage() {
  const [routes, setRoutes] = useState<CarrierRouteRow[]>([]);
  const [canEditTarget, setCanEditTarget] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [filterOrigin, setFilterOrigin] = useState<string | null>(null);
  const [filterDestination, setFilterDestination] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetByRouteId, setTargetByRouteId] = useState<Record<string, string>>({});

  const loadRoutes = useCallback(async () => {
    const data = await fetchCarrierRoutes();
    setCanEditTarget(data.canEditTarget);
    setRoutes(data.routes);

    const savedSelected = new Set<string>();
    const savedTargets: Record<string, string> = {};
    for (const r of data.routes) {
      if (r.selected) savedSelected.add(r.id);
      if (r.carrierTarget != null) savedTargets[r.id] = formatMxn(r.carrierTarget);
    }
    setSelected(savedSelected);
    setTargetByRouteId(savedTargets);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      if (filterOrigin && r.origin !== filterOrigin) return false;
      if (filterDestination && r.destination !== filterDestination) return false;
      return true;
    });
  }, [routes, filterOrigin, filterDestination]);

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

  async function handleSubmit() {
    setSaveError(null);
    setSaveSuccess(false);
    setIsSaving(true);
    try {
      const body = Array.from(selected).map((routeId) => ({
        routeId,
        carrierTarget: parseMxn(targetByRouteId[routeId] ?? "") ?? null,
      }));

      const res = await fetch("/api/carrier/routes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Error al guardar");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError("No se pudieron guardar las selecciones. Intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isLoaded) {
    return <p className="text-muted-foreground">Cargando…</p>;
  }

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Rutas</h1>
        <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
          Selecciona las rutas en las que puedes trabajar y establece tu target.
        </p>
        {!canEditTarget && isLoaded && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            Tu target está bloqueado. Contacta al administrador para poder modificarlo.
          </p>
        )}
      </div>

      {routes.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          No hay rutas disponibles por el momento.
        </p>
      ) : (
        <>
          {/* Filtros */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <CityCombobox
              id="filter-origin"
              label="Origen"
              placeholder="Buscar origen…"
              value={filterOrigin}
              onValueChange={setFilterOrigin}
            />
            <CityCombobox
              id="filter-destination"
              label="Destino"
              placeholder="Buscar destino…"
              value={filterDestination}
              onValueChange={setFilterDestination}
            />
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

          {/* Tabla */}
          <div className="overflow-x-auto rounded-lg border">
            <div className="min-w-[340px]">
            {/* Header */}
            <div className="grid grid-cols-[auto_1fr_130px_56px] gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground sm:px-4">
              <span className="flex items-center">Sel.</span>
              <span className="flex items-center">Ruta</span>
              <span className="flex items-center">Mi target</span>
              <span className="flex items-center">Dif.</span>
            </div>

            {filteredRoutes.length === 0 ? (
              <p className="text-muted-foreground p-6 text-center text-sm">
                No hay rutas con esos filtros.
              </p>
            ) : (
              filteredRoutes.map((route) => {
                const isSelected = selected.has(route.id);
                const currentTarget = parseMxn(targetByRouteId[route.id] ?? "") ?? null;

                return (
                  <div
                    key={route.id}
                    className="grid grid-cols-[auto_1fr_130px_56px] gap-3 items-center border-b px-3 py-3 last:border-b-0 sm:px-4 hover:bg-muted/30 transition-colors"
                  >
                    {/* Checkbox */}
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelected(route.id)}
                        className="size-4 rounded border-input accent-primary"
                        aria-label={`Seleccionar ${route.origin} a ${route.destination}`}
                      />
                    </label>

                    {/* Ruta */}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {route.origin} → {route.destination}
                      </p>
                      {route.description && (
                        <p className="text-muted-foreground truncate text-xs">
                          {route.description}
                        </p>
                      )}
                    </div>

                    {/* Mi target */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground text-sm shrink-0">$</span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={targetByRouteId[route.id] ?? ""}
                        onChange={(e) => handleTargetChange(route.id, e.target.value)}
                        onBlur={() => handleTargetBlur(route.id)}
                        disabled={!canEditTarget}
                        className="h-8 min-w-0 w-full text-sm"
                        aria-label={`Mi target para ${route.origin} a ${route.destination}`}
                      />
                    </div>

                    {/* Diferencia */}
                    <div className="flex items-center">
                      <TargetDiff jtpTarget={route.jtpTarget} carrierTarget={currentTarget} />
                    </div>
                  </div>
                );
              })
            )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-2 pt-2 sm:items-end">
            {saveError && <p className="text-destructive text-sm">{saveError}</p>}
            {saveSuccess && (
              <p className="text-green-600 dark:text-green-400 text-sm">
                Selecciones guardadas correctamente.
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-3">
              <span className="text-muted-foreground text-xs text-center sm:text-left">
                {selected.size} ruta{selected.size !== 1 ? "s" : ""} seleccionada
                {selected.size !== 1 ? "s" : ""}
              </span>
              <Button type="button" onClick={handleSubmit} disabled={isSaving} className="w-full sm:w-auto">
                {isSaving ? "Guardando…" : "Guardar selección"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
