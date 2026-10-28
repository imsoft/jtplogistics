"use client";

import { useState, useEffect, useCallback } from "react";
import { CFDI_USES, TAX_REGIMES, labelOf, missingFiscalData } from "@/lib/sat-catalogs";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientAssignedRoutesCard } from "@/components/dashboard/clients/client-assigned-routes-card";
import { ClientLocationsCard } from "@/components/dashboard/clients/client-locations-card";
import { type AssignedRoute, clientRoutesEndpoint } from "@/components/dashboard/clients/client-routes";
import { Badge } from "@/components/ui/badge";
import { InfoRow } from "@/components/dashboard/users/info-row";
import { ClientViewActions } from "@/components/dashboard/clients/client-view-actions";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import { formatPhone } from "@/lib/utils";
import type { Client } from "@/types/client.types";
import { ResourceDetailSkeleton } from "@/components/ui/skeletons";

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
  const loadRoutes = useCallback(() => {
    if (!id) return;
    fetch(`${clientRoutesEndpoint(id)}?idsOnly=false`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: AssignedRoute[]) => { setRoutes(data); setRoutesLoaded(true); })
      .catch(() => setRoutesLoaded(true));
  }, [id]);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  if (!isLoaded) return <ResourceDetailSkeleton />;
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

      {/* Información */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Información
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          {/* RFC — ancho completo, justo bajo el título */}
          <InfoRow label="RFC" value={client.rfc} />
          <InfoRow label="Régimen fiscal" value={labelOf(TAX_REGIMES, client.taxRegime)} />
          <InfoRow label="CP fiscal" value={client.fiscalZip ?? null} />
          <InfoRow label="Uso del CFDI" value={labelOf(CFDI_USES, client.cfdiUse)} />
          <InfoRow label="Días de crédito" value={client.creditDays != null ? `${client.creditDays} días` : "Sin definir (30 días)"} />
          {missingFiscalData(client).length > 0 && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Para facturarle falta: {missingFiscalData(client).join(", ")}.
            </p>
          )}
          <div className="border-t" />
          <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x">
            <div className="sm:pr-6">
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
            </div>
            <div className="sm:pl-6">
              <InfoRow label="Nombre de contacto" value={client.contactName} />
              <InfoRow label="Puesto" value={client.position} />
              <InfoRow label="Correo" value={client.email} isEmail />
              <InfoRow label="Teléfono" value={formatPhone(client.phone)} />
            </div>
          </div>
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

      <ClientAssignedRoutesCard routes={routes} loaded={routesLoaded} canAssign />

      <ClientLocationsCard clientId={id} routes={routes} loaded={routesLoaded} canEdit />
    </div>
  );
}
