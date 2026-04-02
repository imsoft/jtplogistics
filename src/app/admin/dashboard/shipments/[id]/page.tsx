"use client";

import Link from "next/link";
import { ChevronLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InfoRow } from "@/components/dashboard/users/info-row";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import { SHIPMENT_STATUS_CONFIG } from "@/components/dashboard/resources/shipments-table";
import type { Shipment } from "@/types/shipment.types";

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ShipmentProfilePage() {
  const { data: shipment, isLoaded, error } = useResourceEdit<Shipment>({
    endpoint: "/api/admin/shipments",
    redirectHref: "/admin/dashboard/shipments",
  });

  if (!isLoaded) return <p className="text-muted-foreground py-6">Cargando…</p>;
  if (error || !shipment) return <p className="text-destructive py-6 text-sm">{error ?? "No encontrado"}</p>;

  const title = [shipment.eco, shipment.origin, shipment.destination].filter(Boolean).join(" – ") || "Embarque";

  return (
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/admin/dashboard/shipments" aria-label="Volver a embarques">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl truncate">{title}</h1>
              <Badge
                variant="outline"
                className={`shrink-0 whitespace-nowrap text-xs font-medium border-0 ${SHIPMENT_STATUS_CONFIG[shipment.status]?.badgeClass ?? ""}`}
              >
                {SHIPMENT_STATUS_CONFIG[shipment.status]?.label ?? shipment.status}
              </Badge>
            </div>
            {shipment.legalName && (
              <p className="text-muted-foreground text-xs sm:text-sm truncate">{shipment.legalName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button asChild>
            <Link href={`/admin/dashboard/shipments/${shipment.id}/edit`}>
              <Pencil className="size-4" />
              {shipment.status === "returned" ? "Reabrir para editar" : "Editar"}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Información del embarque
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <InfoRow label="ECO" value={shipment.eco} />
            <InfoRow label="Cliente" value={shipment.client} />
            <InfoRow label="Razón social" value={shipment.legalName} />
            <InfoRow label="Origen" value={shipment.origin} />
            <InfoRow label="Destino" value={shipment.destination} />
            <InfoRow label="Producto" value={shipment.product} />
            <InfoRow label="Recolección" value={fmtDate(shipment.pickupDate)} />
            <InfoRow label="Entrega" value={fmtDate(shipment.deliveryDate)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Operador y unidad
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <InfoRow label="Nombre operador" value={shipment.operatorName} />
            <InfoRow label="Celular" value={shipment.phone} />
            <InfoRow label="Tracto" value={shipment.truck} />
            <InfoRow label="Caja" value={shipment.trailer} />
            <InfoRow label="Unidad" value={shipment.unit} />
          </CardContent>
        </Card>
      </div>

      {(shipment.comments || shipment.incident || shipment.incidentType) && (
        <Card>
          <CardContent className="px-4 py-4 space-y-4">
            {shipment.incident && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Incidencia
                </h3>
                <p className="text-sm whitespace-pre-wrap">{shipment.incident}</p>
              </div>
            )}
            {shipment.incidentType && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Tipo de incidencia
                </h3>
                <p className="text-sm whitespace-pre-wrap">{shipment.incidentType}</p>
              </div>
            )}
            {shipment.comments && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Comentarios
                </h3>
                <p className="text-sm whitespace-pre-wrap">{shipment.comments}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
