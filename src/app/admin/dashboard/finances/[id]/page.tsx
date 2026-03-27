"use client";

import Link from "next/link";
import { ChevronLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoRow } from "@/components/dashboard/users/info-row";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import { formatMxn } from "@/lib/utils";
import type { Finance } from "@/types/finance.types";

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function FinanceProfilePage() {
  const { data: finance, isLoaded, error } = useResourceEdit<Finance>({
    endpoint: "/api/admin/finances",
    redirectHref: "/admin/dashboard/finances",
  });

  if (!isLoaded) return <p className="text-muted-foreground py-6">Cargando…</p>;
  if (error || !finance) return <p className="text-destructive py-6 text-sm">{error ?? "No encontrado"}</p>;

  const title = [finance.eco, finance.origin, finance.destination].filter(Boolean).join(" – ") || "Registro de finanzas";

  return (
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/admin/dashboard/finances" aria-label="Volver a finanzas">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl truncate">{title}</h1>
            {finance.legalName && (
              <p className="text-muted-foreground text-xs sm:text-sm truncate">{finance.legalName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button asChild>
            <Link href={`/admin/dashboard/finances/${finance.id}/edit`}>
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
              Información del registro
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <InfoRow label="ECO" value={finance.eco} />
            <InfoRow label="Cliente" value={finance.client} />
            <InfoRow label="Razón social" value={finance.legalName} />
            <InfoRow label="Origen" value={finance.origin} />
            <InfoRow label="Destino" value={finance.destination} />
            <InfoRow label="Producto" value={finance.product} />
            <InfoRow label="Venta" value={finance.sale != null ? `$${formatMxn(finance.sale)}` : null} />
            <InfoRow label="Costo" value={finance.cost != null ? `$${formatMxn(finance.cost)}` : null} />
            <InfoRow label="Recolección" value={fmtDate(finance.pickupDate)} />
            <InfoRow label="Entrega" value={fmtDate(finance.deliveryDate)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Operador y unidad
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <InfoRow label="Nombre operador" value={finance.operatorName} />
            <InfoRow label="Celular" value={finance.phone} />
            <InfoRow label="Tracto" value={finance.truck} />
            <InfoRow label="Caja" value={finance.trailer} />
            <InfoRow label="Unidad" value={finance.unit} />
          </CardContent>
        </Card>
      </div>

      {(finance.comments || finance.incident || finance.incidentType) && (
        <Card>
          <CardContent className="px-4 py-4 space-y-4">
            {finance.incident && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Incidencia
                </h3>
                <p className="text-sm whitespace-pre-wrap">{finance.incident}</p>
              </div>
            )}
            {finance.incidentType && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Tipo de incidencia
                </h3>
                <p className="text-sm whitespace-pre-wrap">{finance.incidentType}</p>
              </div>
            )}
            {finance.comments && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Comentarios
                </h3>
                <p className="text-sm whitespace-pre-wrap">{finance.comments}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
