"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Pencil, Route as RouteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InfoRow } from "@/components/dashboard/users/info-row";
import { ClientViewActions } from "@/components/dashboard/clients/client-view-actions";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import { useUnitTypes } from "@/hooks/use-unit-types";
import { formatPhone, formatMxn } from "@/lib/utils";
import type { Client } from "@/types/client.types";

interface AssignedRoute {
  id: string;
  origin: string;
  destination: string;
  destinationState: string | null;
  unitType: string;
  unitTargets: { unitType: string; target: number | null }[];
  target: number | null;
  weeklyVolume: number | null;
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
      .then((data: AssignedRoute[]) => { setRoutes(data); setRoutesLoaded(true); })
      .catch(() => setRoutesLoaded(true));
  }, [id]);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

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
              <h1 className="page-heading truncate">{client.name}</h1>
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
            <InfoRow label="Nombre de contacto" value={client.contactName} />
            <InfoRow label="Puesto" value={client.position} />
            <InfoRow label="RFC" value={client.rfc} />
            <InfoRow label="Correo" value={client.email} />
            <InfoRow label="Teléfono" value={formatPhone(client.phone)} />
            <InfoRow label="Dirección" value={client.address} />
            <InfoRow
              label="Tipos de producto"
              value={
                client.productTypes.length > 0 ? (
                  <span className="flex flex-wrap gap-1.5">
                    {client.productTypes.map((t) => (
                      <Badge key={t} variant="secondary" className="font-normal">
                        {t}
                      </Badge>
                    ))}
                  </span>
                ) : (
                  "—"
                )
              }
            />
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
                          <span>Vol/sem</span>
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
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {route.target != null ? `$${formatMxn(route.target)}` : "—"}
                            </span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {route.weeklyVolume != null ? route.weeklyVolume : "—"}
                            </span>
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
