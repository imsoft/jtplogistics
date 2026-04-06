"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  MoveRight,
  Truck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InfoRow } from "@/components/dashboard/users/info-row";
import { useUnitTypes } from "@/hooks/use-unit-types";
import { formatMxn } from "@/lib/utils";
import { ROUTE_STATUS_LABELS } from "@/lib/constants/route-status";
import type { RouteStatus } from "@/types/route.types";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  inactive: "secondary",
  pending: "outline",
};

interface CarrierInfo {
  id: string;
  carrierId: string;
  name: string;
  email: string;
  image: string | null;
  unitType: string;
  carrierTarget: number | null;
  carrierWeeklyVolume: number | null;
  createdAt: string;
}

interface ClientInfo {
  id: string;
  clientId: string;
  name: string;
  email: string | null;
  target: number | null;
  weeklyVolume: number | null;
  createdAt: string;
}

interface RouteDetail {
  id: string;
  origin: string;
  destination: string;
  destinationState: string | null;
  description: string | null;
  target: number | null;
  weeklyVolume: number | null;
  unitType: string;
  unitTargets?: { unitType: string; target: number | null }[];
  status: RouteStatus;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  carriers: CarrierInfo[];
  clients: ClientInfo[];
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function CollaboratorRouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unitTypes = useUnitTypes();

  const unitTypeLabel = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ut of unitTypes) map[ut.value] = ut.label;
    return map;
  }, [unitTypes]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/routes/${id}/detail`)
      .then((r) => {
        if (!r.ok) throw new Error("No encontrado");
        return r.json();
      })
      .then((data: RouteDetail) => {
        setRoute(data);
        setIsLoaded(true);
      })
      .catch((e) => {
        setError(e.message);
        setIsLoaded(true);
      });
  }, [id]);

  if (!isLoaded)
    return <p className="text-muted-foreground py-6">Cargando…</p>;
  if (error || !route)
    return (
      <p className="text-destructive py-6 text-sm">
        {error ?? "No encontrado"}
      </p>
    );

  return (
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => router.back()}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
            <span className="truncate">{route.origin}</span>
            <MoveRight className="size-5 shrink-0 text-muted-foreground" />
            <span className="truncate">{route.destination}</span>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant={STATUS_VARIANT[route.status] ?? "outline"}
              className="text-xs"
            >
              {ROUTE_STATUS_LABELS[route.status] ?? route.status}
            </Badge>
            {route.destinationState && (
              <span className="text-muted-foreground text-xs">
                {route.destinationState}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Información
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <InfoRow label="Origen" value={route.origin} />
            <InfoRow label="Destino" value={route.destination} />
            <InfoRow label="Estado destino" value={route.destinationState} />
            <InfoRow
              label="Tipo de unidad"
              value={
                route.unitTargets && route.unitTargets.length > 1
                  ? route.unitTargets
                      .map((u) => unitTypeLabel[u.unitType] ?? u.unitType)
                      .join(", ")
                  : unitTypeLabel[route.unitType] ?? route.unitType
              }
            />
            <InfoRow
              label="Estatus"
              value={ROUTE_STATUS_LABELS[route.status] ?? route.status}
            />
            <InfoRow label="Creado por" value={route.createdByName} />
            <InfoRow label="Fecha de creación" value={formatDate(route.createdAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Detalles
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {route.unitTargets && route.unitTargets.length > 1 ? (
              route.unitTargets.map((u) => (
                <InfoRow
                  key={u.unitType}
                  label={`Target (${unitTypeLabel[u.unitType] ?? u.unitType})`}
                  value={u.target != null ? `$${formatMxn(u.target)}` : null}
                />
              ))
            ) : (
              <InfoRow
                label="Target (MXN)"
                value={
                  route.target != null ? `$${formatMxn(route.target)}` : null
                }
              />
            )}
            <InfoRow
              label="Volumen semanal"
              value={route.weeklyVolume != null ? route.weeklyVolume : null}
            />
            <InfoRow label="Descripción" value={route.description} />
            <InfoRow label="Última actualización" value={formatDate(route.updatedAt)} />
          </CardContent>
        </Card>
      </div>

      {/* Transportistas */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Transportistas ({route.carriers.length})
          </CardTitle>
          <Truck className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {route.carriers.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed mx-4 mb-4 p-4 text-center text-sm">
              No hay transportistas asignados a esta ruta.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[580px]">
                <div className="grid grid-cols-[1fr_minmax(100px,1fr)_minmax(100px,1fr)_minmax(100px,1fr)_minmax(100px,1fr)] gap-x-6 border-b bg-muted/20 px-4 py-1.5 text-xs font-medium text-muted-foreground">
                  <span>Transportista</span>
                  <span>Tipo de unidad</span>
                  <span>Target</span>
                  <span>Volumen</span>
                  <span>Desde</span>
                </div>
                {route.carriers.map((carrier) => (
                  <div
                    key={carrier.id}
                    className="grid grid-cols-[1fr_minmax(100px,1fr)_minmax(100px,1fr)_minmax(100px,1fr)_minmax(100px,1fr)] gap-x-6 items-center border-b px-4 py-3 last:border-0"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {carrier.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={carrier.image}
                          alt={carrier.name}
                          className="size-7 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold">
                          {initials(carrier.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {carrier.name}
                        </p>
                        <p className="text-muted-foreground text-xs truncate">
                          {carrier.email}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {unitTypeLabel[carrier.unitType] ?? carrier.unitType}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {carrier.carrierTarget != null
                        ? `$${formatMxn(carrier.carrierTarget)}`
                        : "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {carrier.carrierWeeklyVolume ?? "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(carrier.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clientes */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Clientes ({route.clients.length})
          </CardTitle>
          <Users className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {route.clients.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed mx-4 mb-4 p-4 text-center text-sm">
              No hay clientes asignados a esta ruta.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[480px]">
                <div className="grid grid-cols-[1fr_minmax(100px,1fr)_minmax(100px,1fr)_minmax(100px,1fr)] gap-x-6 border-b bg-muted/20 px-4 py-1.5 text-xs font-medium text-muted-foreground">
                  <span>Cliente</span>
                  <span>Tarifa</span>
                  <span>Volumen</span>
                  <span>Desde</span>
                </div>
                {route.clients.map((client) => (
                  <div
                    key={client.id}
                    className="grid grid-cols-[1fr_minmax(100px,1fr)_minmax(100px,1fr)_minmax(100px,1fr)] gap-x-6 items-center border-b px-4 py-3 last:border-0"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold">
                        {initials(client.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {client.name}
                        </p>
                        {client.email && (
                          <p className="text-muted-foreground text-xs truncate">
                            {client.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {client.target != null
                        ? `$${formatMxn(client.target)}`
                        : "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {client.weeklyVolume ?? "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(client.createdAt)}
                    </span>
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
