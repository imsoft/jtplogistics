"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoRow } from "@/components/dashboard/users/info-row";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import { useIncidentTypes } from "@/hooks/use-incident-types";
import { useUnitTypes } from "@/hooks/use-unit-types";
import { formatIncidentYesNo } from "@/lib/incident-yes-no";
import { getIncidentTypeLabel } from "@/lib/incident-type-label";
import { FINANCE_TARIFF_COST_LABEL, FINANCE_TARIFF_SALE_LABEL } from "@/lib/constants/finance-tariff-labels";
import { formatMxn } from "@/lib/utils";
import { SHIPMENT_STATUS_CONFIG } from "@/components/dashboard/resources/shipments-table";
import type { FinanceShipmentDetail } from "@/types/finance.types";
import type { ShipmentStatus } from "@/types/shipment.types";

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function FinanceShipmentReadOnlyPage() {
  const { data: row, isLoaded, error } = useResourceEdit<FinanceShipmentDetail>({
    endpoint: "/api/admin/finances",
    redirectHref: "/admin/dashboard/finances",
  });
  const incidentTypes = useIncidentTypes();
  const unitTypes = useUnitTypes();

  const incidentTypeLabel = useMemo(() => {
    if (!row?.incidentType?.trim()) return null;
    return getIncidentTypeLabel(row.incidentType, incidentTypes);
  }, [row?.incidentType, incidentTypes]);

  const unitLabel = useMemo(() => {
    if (!row?.unit?.trim()) return null;
    return unitTypes.find((t) => t.value === row.unit)?.label ?? row.unit;
  }, [row?.unit, unitTypes]);

  if (!isLoaded) return <p className="text-muted-foreground py-6">Cargando…</p>;
  if (error || !row?.shipmentId) {
    return <p className="text-destructive py-6 text-sm">{error ?? "No encontrado"}</p>;
  }

  const title = [row.eco, row.origin, row.destination].filter(Boolean).join(" – ") || "Embarque";
  const statusCfg = SHIPMENT_STATUS_CONFIG[row.status as ShipmentStatus];

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/admin/dashboard/finances" aria-label="Volver a finanzas">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="page-heading truncate">{title}</h1>
              <Badge
                variant="outline"
                className={`shrink-0 whitespace-nowrap border-0 text-xs font-medium ${statusCfg?.badgeClass ?? ""}`}
              >
                {statusCfg?.label ?? row.status}
              </Badge>
            </div>
            {row.legalName && (
              <p className="text-muted-foreground truncate text-xs sm:text-sm">{row.legalName}</p>
            )}
            <p className="text-muted-foreground mt-1 text-[10px] font-semibold uppercase tracking-wide sm:text-xs">
              Vista de solo lectura. Los cambios se hacen en la tabla de embarques.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Embarque y tarifas
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <InfoRow label="ECO" value={row.eco} />
            <InfoRow label="Cliente" value={row.client} />
            <InfoRow label="Razón social" value={row.legalName} />
            <InfoRow label="Origen" value={row.origin} />
            <InfoRow label="Destino" value={row.destination} />
            <InfoRow label="Producto" value={row.product} />
            <InfoRow
              label={FINANCE_TARIFF_SALE_LABEL}
              value={row.sale != null ? `$${formatMxn(row.sale)}` : null}
            />
            <InfoRow
              label={FINANCE_TARIFF_COST_LABEL}
              value={row.cost != null ? `$${formatMxn(row.cost)}` : null}
            />
            <InfoRow label="Recolección" value={fmtDate(row.pickupDate)} />
            <InfoRow label="Entrega" value={fmtDate(row.deliveryDate)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Operador y unidad
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <InfoRow label="Nombre operador" value={row.operatorName} />
            <InfoRow label="Celular" value={row.phone} />
            <InfoRow label="Tracto" value={row.truck} />
            <InfoRow label="Caja" value={row.trailer} />
            <InfoRow label="Unidad" value={unitLabel} />
          </CardContent>
        </Card>
      </div>

      {(row.comments || row.incident || row.incidentType) && (
        <Card>
          <CardContent className="space-y-4 px-4 py-4">
            {row.incident && (
              <div>
                <h3 className="text-muted-foreground mb-1 text-sm font-semibold uppercase tracking-wider">
                  Incidencia
                </h3>
                <p className="text-sm whitespace-pre-wrap">{formatIncidentYesNo(row.incident)}</p>
              </div>
            )}
            {row.incidentType && (
              <div>
                <h3 className="text-muted-foreground mb-1 text-sm font-semibold uppercase tracking-wider">
                  Tipo de incidencia
                </h3>
                <p className="text-sm whitespace-pre-wrap">{incidentTypeLabel}</p>
              </div>
            )}
            {row.comments && (
              <div>
                <h3 className="text-muted-foreground mb-1 text-sm font-semibold uppercase tracking-wider">
                  Comentarios
                </h3>
                <p className="text-sm whitespace-pre-wrap">{row.comments}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
