"use client";

import { useState, useEffect, useMemo } from "react";
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
import { formatPhone } from "@/lib/utils";
import type { Client } from "@/types/client.types";

interface AssignedRoute {
  id: string;
  origin: string;
  destination: string;
  destinationState: string | null;
  unitType: string;
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

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/clients/${id}/routes?idsOnly=false`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { setRoutes(data); setRoutesLoaded(true); })
      .catch(() => setRoutesLoaded(true));
  }, [id]);

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
          <ClientViewActions clientId={id} onSave={() => {
            fetch(`/api/admin/clients/${id}/routes?idsOnly=false`)
              .then((r) => (r.ok ? r.json() : []))
              .then(setRoutes)
              .catch(() => {});
          }} />
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

        {client.notes && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Notas
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
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
            <div className="overflow-x-auto">
              <div className="min-w-[420px]">
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
                  <span>Ruta</span>
                  <span>Tipo de unidad</span>
                  <span>Estado</span>
                </div>
                {routes.map((route) => (
                  <div
                    key={route.id}
                    className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center border-b px-4 py-3 last:border-0"
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
                      {unitTypeLabel[route.unitType] ?? route.unitType}
                    </span>
                    <Badge variant={STATUS_VARIANT[route.status] ?? "outline"} className="text-xs">
                      {STATUS_LABELS[route.status] ?? route.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
