"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Pencil, Route as RouteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InfoRow } from "@/components/dashboard/users/info-row";
import { ClientViewActions } from "@/components/dashboard/clients/client-view-actions";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import { useUnitTypes } from "@/hooks/use-unit-types";
import { formatPhone } from "@/lib/utils";
import { toast } from "sonner";
import type { Client } from "@/types/client.types";

interface AssignedRoute {
  id: string;
  origin: string;
  destination: string;
  destinationState: string | null;
  unitType: string;
  target: number | null;
  weeklyVolume: number | null;
  clientTarget: number | null;
  clientWeeklyVolume: number | null;
  createdByName: string | null;
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  inactive: "Inactiva",
  pending: "Pendiente",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  inactive: "secondary",
  pending: "outline",
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data: client, isLoaded, error } = useResourceEdit<Client>({
    endpoint: "/api/admin/clients",
    redirectHref: "/admin/dashboard/clients",
  });

  const [routes, setRoutes] = useState<AssignedRoute[]>([]);
  const [routesLoaded, setRoutesLoaded] = useState(false);
  const [editTargets, setEditTargets] = useState<Record<string, string>>({});
  const [editVolumes, setEditVolumes] = useState<Record<string, string>>({});
  const saveTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const unitTypes = useUnitTypes();

  const unitTypeLabel = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ut of unitTypes) map[ut.value] = ut.label;
    return map;
  }, [unitTypes]);

  const loadRoutes = useCallback(() => {
    if (!id) return;
    fetch(`/api/admin/clients/${id}/routes?idsOnly=false`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: AssignedRoute[]) => {
        setRoutes(data);
        const targets: Record<string, string> = {};
        const volumes: Record<string, string> = {};
        for (const r of data) {
          if (r.target != null) targets[r.id] = String(r.target);
          if (r.weeklyVolume != null) volumes[r.id] = String(r.weeklyVolume);
        }
        setEditTargets(targets);
        setEditVolumes(volumes);
        setRoutesLoaded(true);
      })
      .catch(() => setRoutesLoaded(true));
  }, [id]);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  const saveRouteField = useCallback((routeId: string, target: string | undefined, volume: string | undefined) => {
    const parsedTarget = target?.trim() ? Number(target.replace(/,/g, "")) : null;
    const parsedVolume = volume?.trim() ? Math.round(Number(volume)) : null;

    fetch(`/api/admin/clients/${id}/routes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routeId,
        target: parsedTarget != null && !isNaN(parsedTarget) ? parsedTarget : null,
        weeklyVolume: parsedVolume != null && !isNaN(parsedVolume) ? parsedVolume : null,
      }),
    }).then((res) => {
      if (!res.ok) toast.error("Error al guardar");
    }).catch(() => toast.error("Error al guardar"));
  }, [id]);

  const debouncedSave = useCallback((routeId: string) => {
    if (saveTimerRef.current[routeId]) clearTimeout(saveTimerRef.current[routeId]);
    saveTimerRef.current[routeId] = setTimeout(() => {
      saveRouteField(routeId, editTargets[routeId], editVolumes[routeId]);
    }, 800);
  }, [saveRouteField, editTargets, editVolumes]);

  function handleTargetChange(routeId: string, value: string) {
    setEditTargets((prev) => ({ ...prev, [routeId]: value }));
  }

  function handleVolumeChange(routeId: string, value: string) {
    setEditVolumes((prev) => ({ ...prev, [routeId]: value }));
  }

  if (!isLoaded) return <p className="text-muted-foreground py-6">Cargando…</p>;
  if (error || !client) return <p className="text-destructive py-6 text-sm">{error ?? "No encontrado"}</p>;

  return (
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/admin/dashboard/clients" aria-label="Volver a clientes">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
              {initials(client.name)}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl truncate">{client.name}</h1>
              {client.legalName && (
                <p className="text-muted-foreground text-xs sm:text-sm truncate">{client.legalName}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ClientViewActions clientId={id} onSave={loadRoutes} />
          <Button asChild>
            <Link href={`/admin/dashboard/clients/${id}/edit`}>
              <Pencil className="size-4" />
              Editar
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Información
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <InfoRow label="RFC" value={client.rfc} />
            <InfoRow label="Correo" value={client.email} />
            <InfoRow label="Teléfono" value={formatPhone(client.phone)} />
            <InfoRow label="Dirección" value={client.address} />
            <InfoRow
              label="Registro"
              value={new Date(client.createdAt).toLocaleDateString("es-MX", {
                year: "numeric", month: "long", day: "numeric",
              })}
            />
          </CardContent>
        </Card>

        {(client.detentionConditions || client.notes) && (
          <Card>
            <CardContent className="px-4 py-4 space-y-4">
              {client.detentionConditions && (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Condiciones de estadías
                  </h3>
                  <p className="text-sm whitespace-pre-wrap">{client.detentionConditions}</p>
                </div>
              )}
              {client.notes && (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Notas
                  </h3>
                  <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Rutas asignadas */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Rutas asignadas {routesLoaded && `(${routes.length})`}
          </CardTitle>
          <RouteIcon className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {!routesLoaded ? (
            <p className="text-muted-foreground text-sm px-4 pb-4">Cargando rutas…</p>
          ) : routes.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed mx-4 mb-4 p-4 text-center text-sm">
              No hay rutas asignadas. Usa el botón "Seleccionar rutas" para asignarlas.
            </p>
          ) : (
            <div className="space-y-0">
              {(() => {
                const grouped = new Map<string, AssignedRoute[]>();
                for (const r of routes) {
                  const group = grouped.get(r.unitType) ?? [];
                  group.push(r);
                  grouped.set(r.unitType, group);
                }
                return Array.from(grouped.entries()).map(([ut, items]) => (
                  <div key={ut}>
                    <div className="border-b bg-muted/60 px-4 py-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {unitTypeLabel[ut] ?? ut}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <div className="min-w-[660px]">
                        <div className="grid grid-cols-[1fr_minmax(100px,1fr)_minmax(100px,1fr)_minmax(120px,1fr)_minmax(80px,1fr)] gap-x-6 border-b bg-muted/20 px-4 py-1.5 text-xs font-medium text-muted-foreground">
                          <span>Ruta</span>
                          <span>Tarifa</span>
                          <span>Volumen</span>
                          <span>Creado por</span>
                          <span>Estado</span>
                        </div>
                        {items.map((route) => (
                          <div
                            key={route.id}
                            className="grid grid-cols-[1fr_minmax(100px,1fr)_minmax(100px,1fr)_minmax(120px,1fr)_minmax(80px,1fr)] gap-x-6 items-center border-b px-4 py-3 last:border-0 transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/30"
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
                                value={editTargets[route.id] ?? ""}
                                onChange={(e) => handleTargetChange(route.id, e.target.value)}
                                onBlur={() => saveRouteField(route.id, editTargets[route.id], editVolumes[route.id])}
                                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                placeholder="—"
                                className="h-7 w-24 text-xs"
                              />
                            </div>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              value={editVolumes[route.id] ?? ""}
                              onChange={(e) => handleVolumeChange(route.id, e.target.value)}
                              onBlur={() => saveRouteField(route.id, editTargets[route.id], editVolumes[route.id])}
                              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                              placeholder="—"
                              className="h-7 w-20 text-xs"
                            />
                            <span className="text-xs text-muted-foreground whitespace-nowrap truncate">
                              {route.createdByName ?? "—"}
                            </span>
                            <Badge variant={STATUS_VARIANT[route.status] ?? "outline"} className="text-xs">
                              {STATUS_LABELS[route.status] ?? route.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
