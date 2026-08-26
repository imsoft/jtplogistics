"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDown, Lock, MoveRight } from "lucide-react";
import type { TargetStatus } from "@/lib/target-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppSelect } from "@/components/ui/app-select";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMxnLive, formatMxn, parseMxn } from "@/lib/utils";
import { useUnitTypes } from "@/hooks/use-unit-types";
import { toast } from "sonner";

interface RouteSelection {
  unitType: string;
  carrierTarget: number | null;
  carrierWeeklyVolume: number | null;
  /** El transportista ya solicitó el desbloqueo de esta ruta (pendiente de aprobación de JTP). */
  editUnlockRequested: boolean;
  /** JTP aprobó el desbloqueo: la ruta puede editarse una vez hasta que se guarde. */
  editUnlockApproved: boolean;
  /** Semáforo contra el target de JTP, calculado en servidor. Nunca expone precio ni porcentaje. */
  targetStatus: TargetStatus | null;
}

interface CarrierRouteRow {
  id: string;
  origin: string;
  destination: string;
  description: string | null;
  unitType: string;
  /** Tipos de unidad disponibles para esta ruta (sin precios, confidenciales para el admin). */
  unitTargets: { unitType: string }[];
  status: "active" | "pending" | "inactive";
  /** Volumen mensual escrito por JTP (solo se muestra en rutas activas). */
  jtpVolume: number | null;
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

// Semáforo del target del transportista contra el target de JTP. Solo muestra el color;
// el cálculo se hace en el servidor sin exponer el precio ni el porcentaje.
function TargetStatusLight({ status }: { status: TargetStatus | null }) {
  if (status == null) return null;
  const emoji = status === "verde" ? "🟢" : status === "amarillo" ? "🟡" : "🔴";
  const label =
    status === "verde"
      ? "Target dentro del objetivo"
      : status === "amarillo"
        ? "Target ligeramente por encima del objetivo"
        : "Target por encima del objetivo";
  return (
    <span role="img" aria-label={label} title={label} className="text-base leading-none">
      {emoji}
    </span>
  );
}

/** Una ruta está pactada cuando el transportista ya la tiene guardada en esta unidad. */
type AgreementFilter = "agreed" | "pending" | "all";

const AGREEMENT_OPTIONS = [
  { value: "agreed", label: "Pactadas" },
  { value: "pending", label: "Sin pactar" },
  { value: "all", label: "Todas" },
];

interface CarrierRoutesManagerProps {
  showSemaforo: boolean;
  /**
   * Con qué filtro arranca la pantalla. Al entrar por "Gestionar" interesan las
   * rutas ya pactadas, no el catálogo completo.
   */
  defaultAgreement?: AgreementFilter;
}

/**
 * Gestor de rutas del transportista por tipo de unidad. Se usa en dos páginas
 * idénticas: una sin la columna del semáforo y otra con ella (showSemaforo).
 */
export function CarrierRoutesManager({
  showSemaforo,
  defaultAgreement = "all",
}: CarrierRoutesManagerProps) {
  const { unitType } = useParams<{ unitType: string }>();
  const router = useRouter();
  const [allRoutes, setAllRoutes] = useState<CarrierRouteRow[]>([]);
  const [canEditTarget, setCanEditTarget] = useState(false);
  const [canEditRoutes, setCanEditRoutes] = useState(false);
  const [canAddRoutes, setCanAddRoutes] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [filterOrigin, setFilterOrigin] = useState<string | null>(null);
  const [filterDestination, setFilterDestination] = useState<string | null>(null);
  const [filterAgreement, setFilterAgreement] = useState<AgreementFilter>(defaultAgreement);

  // Selection state for THIS unit type page only
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [originalSelected, setOriginalSelected] = useState<Set<string>>(new Set());
  const [targetByRouteId, setTargetByRouteId] = useState<Record<string, string>>({});
  const [originalTargetByRouteId, setOriginalTargetByRouteId] = useState<Record<string, string>>({});
  const [weeklyVolumeByRouteId, setWeeklyVolumeByRouteId] = useState<Record<string, string>>({});
  const [originalVolumeByRouteId, setOriginalVolumeByRouteId] = useState<Record<string, string>>({});
  const [statusByRouteId, setStatusByRouteId] = useState<Record<string, TargetStatus | null>>({});
  // Estado del desbloqueo por ruta (para el tipo de unidad actual).
  const [unlockApprovedByRouteId, setUnlockApprovedByRouteId] = useState<Record<string, boolean>>({});
  const [unlockRequestedByRouteId, setUnlockRequestedByRouteId] = useState<Record<string, boolean>>({});
  // Rutas para las que se está enviando la solicitud de desbloqueo en este momento.
  const [requestingUnlock, setRequestingUnlock] = useState<Set<string>>(new Set());

  // Para el botón que baja a guardar y para saber si el pie ya está a la vista.
  const footerRef = useRef<HTMLDivElement>(null);
  const [footerVisible, setFooterVisible] = useState(false);

  const unitTypes = useUnitTypes();
  const unitTypeLabel = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ut of unitTypes) map[ut.value] = ut.label;
    return map;
  }, [unitTypes]);

  const pageTitle = unitTypeLabel[unitType] ?? unitType;

  // Columnas del grid: con o sin la columna del semáforo.
  const gridCols = showSemaforo
    ? "grid-cols-[auto_1fr_130px_80px_70px]"
    : "grid-cols-[auto_1fr_130px_80px]";

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
    const savedStatuses: Record<string, TargetStatus | null> = {};
    const savedApproved: Record<string, boolean> = {};
    const savedRequested: Record<string, boolean> = {};
    for (const r of data.routes) {
      const sel = r.selections?.find((s) => s.unitType === unitType);
      if (sel) {
        savedSelected.add(r.id);
        if (sel.carrierTarget != null) savedTargets[r.id] = formatMxn(sel.carrierTarget);
        if (sel.carrierWeeklyVolume != null) savedVolumes[r.id] = String(sel.carrierWeeklyVolume);
        savedStatuses[r.id] = sel.targetStatus ?? null;
        savedApproved[r.id] = sel.editUnlockApproved;
        savedRequested[r.id] = sel.editUnlockRequested;
      }
    }
    setSelected(savedSelected);
    setOriginalSelected(savedSelected);
    setTargetByRouteId(savedTargets);
    setOriginalTargetByRouteId(savedTargets);
    setWeeklyVolumeByRouteId(savedVolumes);
    setOriginalVolumeByRouteId(savedVolumes);
    setStatusByRouteId(savedStatuses);
    setUnlockApprovedByRouteId(savedApproved);
    setUnlockRequestedByRouteId(savedRequested);

    // Abrir en "Pactadas" sin tener ninguna dejaría la pantalla vacía y sin
    // pistas: en ese caso se muestra el catálogo completo.
    if (defaultAgreement === "agreed" && savedSelected.size === 0) {
      setFilterAgreement("all");
    }
    setIsLoaded(true);
  }, [unitType, defaultAgreement]);

  useEffect(() => {
    setIsLoaded(false);
    loadRoutes();
  }, [loadRoutes]);

  // El botón flotante solo tiene sentido mientras el pie está fuera de la
  // pantalla: si ya se ve el de "Guardar selección", sobra.
  useEffect(() => {
    const node = footerRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { rootMargin: "-40px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isLoaded]);

  // Rutas que incluyen este tipo de unidad (perfil de la ruta, no filas duplicadas)
  const routes = useMemo(
    () =>
      allRoutes.filter((route) =>
        route.unitTargets?.some((t) => t.unitType === unitType) ?? route.unitType === unitType
      ),
    [allRoutes, unitType]
  );

  // Origen y destino se listan sobre lo que deja ver el filtro de pactadas: no
  // tiene caso ofrecer un origen que no va a mostrar ninguna ruta.
  const routesByAgreement = useMemo(() => {
    if (filterAgreement === "all") return routes;
    return routes.filter((r) =>
      filterAgreement === "agreed" ? originalSelected.has(r.id) : !originalSelected.has(r.id)
    );
  }, [routes, filterAgreement, originalSelected]);

  const origins = useMemo(
    () => [...new Set(routesByAgreement.map((r) => r.origin))].sort(),
    [routesByAgreement]
  );

  const destinations = useMemo(() => {
    const base = filterOrigin
      ? routesByAgreement.filter((r) => r.origin === filterOrigin)
      : routesByAgreement;
    return [...new Set(base.map((r) => r.destination))].sort();
  }, [routesByAgreement, filterOrigin]);

  /** Las que ya tienen selección guardada en este tipo de unidad. */
  const agreedCount = useMemo(
    () => routes.filter((r) => originalSelected.has(r.id)).length,
    [routes, originalSelected]
  );

  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      if (filterOrigin && r.origin !== filterOrigin) return false;
      if (filterDestination && r.destination !== filterDestination) return false;
      if (filterAgreement === "agreed" && !originalSelected.has(r.id)) return false;
      if (filterAgreement === "pending" && originalSelected.has(r.id)) return false;
      return true;
    });
  }, [routes, filterOrigin, filterDestination, filterAgreement, originalSelected]);

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

  const selectedCount = selected.size;

  // ¿Hay alguna ruta con desbloqueo aprobado por JTP (editable ahora)?
  const hasApprovedUnlock = useMemo(
    () => Object.values(unlockApprovedByRouteId).some(Boolean),
    [unlockApprovedByRouteId]
  );

  async function requestUnlock(routeId: string) {
    setRequestingUnlock((prev) => new Set(prev).add(routeId));
    try {
      const res = await fetch("/api/carrier/routes/unlock-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId, unitType }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "No se pudo enviar la solicitud");
      }
      setUnlockRequestedByRouteId((prev) => ({ ...prev, [routeId]: true }));
      toast.success("Solicitud de desbloqueo enviada a JTP. Te avisaremos cuando la revisen.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo enviar la solicitud. Intenta de nuevo.");
    } finally {
      setRequestingUnlock((prev) => {
        const next = new Set(prev);
        next.delete(routeId);
        return next;
      });
    }
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
    const formatted = formatMxnLive(raw);
    setTargetByRouteId((prev) => ({ ...prev, [routeId]: formatted }));

    // El semáforo NO se calcula en automático mientras se escribe: solo refleja
    // lo ya guardado. Al editar el target, se oculta hasta que se vuelva a guardar.
    if (!showSemaforo) return;
    setStatusByRouteId((prev) => ({ ...prev, [routeId]: null }));
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
      router.push("/carrier/dashboard");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudieron guardar las selecciones. Intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isLoaded) {
    return <p className="text-muted-foreground">Cargando…</p>;
  }

  // El volumen no está bloqueado por el candado (solo protege el target),
  // así que un cambio de volumen también habilita guardar.
  const volumesChanged = [...selected].some(
    (id) => (weeklyVolumeByRouteId[id]?.trim() ?? "") !== (originalVolumeByRouteId[id] ?? "")
  );

  const canSave = newSelections.size > 0 || canEditRoutes || hasApprovedUnlock || volumesChanged;

  // Cambios sin guardar: marcar o desmarcar una ruta, mover un target o un
  // volumen. Es lo que enciende el botón que baja al pie.
  const selectionChanged =
    selected.size !== originalSelected.size || [...selected].some((id) => !originalSelected.has(id));
  const targetsChanged = [...selected].some(
    (id) => (targetByRouteId[id]?.trim() ?? "") !== (originalTargetByRouteId[id] ?? "")
  );
  const hasPendingChanges = selectionChanged || volumesChanged || targetsChanged;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div>
        <h1 className="page-heading">{pageTitle}</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
          Selecciona las rutas que ofreces para <strong>{pageTitle}</strong> y establece tu target y
          volumen mensual.
        </p>
      </div>

      {isLoaded && !hasAnySelectionGlobally && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="space-y-1 py-3 sm:py-4">
            <CardTitle className="text-base">Primer paso: tus rutas</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Marca las rutas que operas, completa tu target y volumen mensual, y guarda. Repite en cada
              tipo de unidad que manejes. Cuando termines, en <strong>Inicio</strong> verás el resumen de
              toda tu operación.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {isLoaded && originalSelected.size > 0 && (
        <div className="rounded-lg border p-3 sm:p-4 flex items-start gap-2">
          <Lock className="size-3.5 shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            En las rutas ya guardadas solo puedes actualizar tu volumen mensual; el target queda
            bloqueado y únicamente puedes agregar rutas nuevas.
            {showSemaforo && (
              <>
                {" "}
                <span className="font-medium text-foreground">
                  Si una ruta salió en rojo (🔴), puedes contactar a pricing de JTP o solicitar el
                  desbloqueo de esa ruta para actualizar tu target.
                </span>
              </>
            )}
          </p>
        </div>
      )}

      {routes.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          No hay rutas disponibles por el momento.
        </p>
      ) : (
        <>
          {/* Filtros de pactadas y de origen/destino */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="filter-agreement">Rutas</Label>
              <AppSelect
                value={filterAgreement}
                onValueChange={(v) => {
                  setFilterAgreement(v as AgreementFilter);
                  setFilterOrigin(null);
                  setFilterDestination(null);
                }}
                options={AGREEMENT_OPTIONS}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                {agreedCount === 0
                  ? "Todavía no tienes rutas pactadas en esta unidad."
                  : `Tienes ${agreedCount} ruta${agreedCount === 1 ? "" : "s"} pactada${agreedCount === 1 ? "" : "s"} en esta unidad.`}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-origin">Origen</Label>
              <AppSelect
                value={filterOrigin ?? "__all__"}
                onValueChange={(v) => {
                  setFilterOrigin(v === "__all__" ? null : v);
                  setFilterDestination(null);
                }}
                options={[{value: "__all__", label: "Todos"}, ...origins.map((o) => ({value: o, label: o}))]}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-destination">Destino</Label>
              <AppSelect
                value={filterDestination ?? "__all__"}
                onValueChange={(v) => setFilterDestination(v === "__all__" ? null : v)}
                options={[{value: "__all__", label: "Todos"}, ...destinations.map((d) => ({value: d, label: d}))]}
                disabled={origins.length === 0}
                className="w-full"
              />
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
                  setFilterAgreement(defaultAgreement);
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          </div>

          {/* Tabla agrupada por origen */}
          {filteredRoutes.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
              {filterAgreement === "agreed"
                ? "No tienes rutas pactadas con esos filtros. Cambia a “Sin pactar” para elegir nuevas."
                : filterAgreement === "pending"
                  ? "No quedan rutas sin pactar con esos filtros."
                  : "No hay rutas con esos filtros."}
            </p>
          ) : (
            <div className="space-y-4">
              {groupedRoutes.map(({ origin, items }) => (
                <div key={origin} className="overflow-x-auto rounded-lg border">
                  <div className="min-w-120">
                    <div className="border-b bg-muted/60 px-3 py-2 sm:px-4">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Desde {origin}
                      </span>
                    </div>
                    <div className={`grid ${gridCols} gap-3 border-b bg-muted/20 px-3 py-1.5 text-xs font-medium text-muted-foreground sm:px-4`}>
                      <span className="flex items-center">Sel.</span>
                      <span className="flex items-center">Ruta</span>
                      <span className="flex items-center">Mi target</span>
                      <span className="flex items-center">Vol./mes</span>
                      {showSemaforo && <span className="flex items-center justify-center">Semáforo</span>}
                    </div>
                    {items.map((route) => {
                      const isSelected = selected.has(route.id);
                      const isOriginallySelected = originalSelected.has(route.id);
                      const isActiveRoute = route.status === "active";
                      const targetStatus = statusByRouteId[route.id] ?? null;

                      const isApproved = unlockApprovedByRouteId[route.id] ?? false;
                      const isRequested = unlockRequestedByRouteId[route.id] ?? false;
                      const isLocked = isOriginallySelected && !canEditRoutes && !isApproved;
                      // Ruta guardada, bloqueada y en rojo: puede contactar a pricing o solicitar desbloqueo.
                      const canAskUnlock = showSemaforo && isLocked && (statusByRouteId[route.id] ?? null) === "rojo";
                      const contactDraft = `Hola, quiero hablar con el gerente de compras de JTP sobre la ruta ${route.origin} → ${route.destination} (${pageTitle}).`;
                      const pricingDraft = `Hola, quiero revisar la situación de mi target para la ruta ${route.origin} → ${route.destination} (${pageTitle}), que salió en rojo.`;

                      return (
                        <div
                          key={route.id}
                          className={`grid ${gridCols} gap-3 items-center border-b px-3 py-3 last:border-b-0 sm:px-4 hover:bg-hover hover:text-hover-foreground transition-colors`}
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
                            {!isActiveRoute && (
                              <p className="text-xs text-muted-foreground">
                                Favor de contactar al{" "}
                                <Link
                                  href={`/carrier/dashboard/messages?draft=${encodeURIComponent(contactDraft)}`}
                                  className="font-medium text-primary underline underline-offset-2"
                                >
                                  encargado de compras de JTP
                                </Link>
                              </p>
                            )}
                            {canAskUnlock && (
                              isRequested ? (
                                <p className="text-xs text-muted-foreground">
                                  Solicitud de desbloqueo enviada. JTP la revisará.
                                </p>
                              ) : (
                                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                  <span className="font-medium text-red-600">En rojo:</span>
                                  <Link
                                    href={`/carrier/dashboard/messages?draft=${encodeURIComponent(pricingDraft)}`}
                                    className="font-medium text-primary underline underline-offset-2"
                                  >
                                    Contactar a pricing de JTP
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => requestUnlock(route.id)}
                                    disabled={requestingUnlock.has(route.id)}
                                    className="font-medium text-primary underline underline-offset-2 disabled:opacity-50"
                                  >
                                    {requestingUnlock.has(route.id) ? "Enviando…" : "Solicitar desbloqueo"}
                                  </button>
                                </div>
                              )
                            )}
                            {isApproved && (
                              <p className="text-xs font-medium text-green-600">
                                Desbloqueo aprobado por JTP. Actualiza tu target y guarda.
                              </p>
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
                              disabled={!isSelected || isLocked}
                              className="h-8 min-w-0 w-full text-sm"
                              aria-label={`Mi target para ${route.origin} a ${route.destination}`}
                            />
                          </div>

                          <div className="min-w-0">
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              value={weeklyVolumeByRouteId[route.id] ?? ""}
                              onChange={(e) => handleVolumeChange(route.id, e.target.value)}
                              disabled={!isSelected}
                              className="h-8 w-full text-sm"
                              aria-label={`Volumen mensual para ${route.origin} a ${route.destination}`}
                            />
                            {isActiveRoute && route.jtpVolume != null && (
                              <p
                                className="mt-0.5 text-[10px] text-muted-foreground"
                                title="Volumen mensual definido por JTP"
                              >
                                JTP: {route.jtpVolume}
                              </p>
                            )}
                          </div>

                          {showSemaforo && (
                            <div className="flex items-center justify-center">
                              <TargetStatusLight status={targetStatus} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div ref={footerRef} className="flex flex-col gap-2 pt-2 sm:items-end">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-3">
              <span className="text-muted-foreground text-xs text-center sm:text-left">
                {selectedCount} ruta{selectedCount !== 1 ? "s" : ""} seleccionada
                {selectedCount !== 1 ? "s" : ""} para {pageTitle}
                {!canEditRoutes && canAddRoutes && newSelections.size > 0 && (
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

          {/* Atajo al pie: con la lista larga, guardar quedaba muy abajo. Se
              muestra siempre que el botón de guardar no esté a la vista; no
              solo al cambiar algo, porque al entrar por "Gestionar" las rutas
              pactadas ya vienen marcadas y no habría ningún cambio todavía. */}
          {!footerVisible && (
            <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
              <Button
                type="button"
                onClick={() =>
                  footerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
                }
                className="pointer-events-auto shadow-lg"
              >
                <ArrowDown className="size-4" />
                Ir a guardar
                {hasPendingChanges && newSelections.size > 0
                  ? ` (${newSelections.size} nueva${newSelections.size === 1 ? "" : "s"})`
                  : ""}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
