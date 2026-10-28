"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, ChevronLeft, Circle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoRow } from "@/components/dashboard/users/info-row";
import { ResourceDetailSkeleton } from "@/components/ui/skeletons";
import { useIncidentTypes } from "@/hooks/use-incident-types";
import { useUnitTypes } from "@/hooks/use-unit-types";
import { formatIncidentYesNo } from "@/lib/incident-yes-no";
import { getIncidentTypeLabel } from "@/lib/incident-type-label";
import { formatMxn, formatPhone } from "@/lib/utils";
import { shipmentStatusDisplay } from "@/components/dashboard/resources/shipments-table";
import type { FinanceShipmentDetail } from "@/types/finance.types";

function fmtDate(iso: string | null | undefined) {
  if (!iso) return null;
  // La fecha se guarda a medianoche UTC: en hora de México sería el día anterior.
  return new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
const money = (v: number | null | undefined) => (v != null ? `$${formatMxn(v)}` : null);

/** Tarifa con su desglose: base, cada costo extra y el total. */
function TariffRows({ label, base, total, extras }: { label: string; base: number | null | undefined; total: number | null; extras: { concept: string; amount: number | null }[] }) {
  const withExtras = extras.filter((x) => x.amount != null && x.amount !== 0);
  if (withExtras.length === 0) return <InfoRow label={label} value={money(total)} />;
  return (
    <>
      <InfoRow label={`${label} (base)`} value={money(base)} />
      {withExtras.map((x, i) => (
        <InfoRow key={i} label={`+ ${x.concept}`} value={money(x.amount)} />
      ))}
      <InfoRow label={`${label} total`} value={<b>{money(total)}</b>} />
    </>
  );
}

/**
 * Ficha de un embarque en Finanzas: lo del cliente (venta), lo del proveedor
 * (compra) y el embarque, por separado. Las evidencias se marcan aquí.
 */
export function FinanceDetailView({ panel, canMarkEvidence }: { panel: "admin" | "collaborator"; canMarkEvidence: boolean }) {
  const base = `/${panel}/dashboard/finances`;
  const api = `/api/${panel}/finances`;
  const { id } = useParams<{ id: string }>();
  const [row, setRow] = useState<FinanceShipmentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const incidentTypes = useIncidentTypes();
  const unitTypes = useUnitTypes();

  useEffect(() => {
    if (!id) return;
    fetch(`${api}/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: FinanceShipmentDetail) => setRow(d))
      .catch(() => setError("No se pudo cargar el embarque."));
  }, [api, id]);

  const incidentTypeLabel = row?.incidentType?.trim() ? getIncidentTypeLabel(row.incidentType, incidentTypes) : null;
  const unitLabel = row?.unit?.trim() ? unitTypes.find((t) => t.value === row.unit)?.label ?? row.unit : null;

  async function toggleEvidence() {
    if (!row) return;
    setBusy(true);
    try {
      const res = await fetch(`${api}/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidenceReceived: !row.evidenceReceivedOn }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string; evidenceReceivedOn?: string | null };
      if (!res.ok) throw new Error(d.error ?? "No se pudo guardar.");
      setRow({ ...row, evidenceReceivedOn: d.evidenceReceivedOn ?? null });
      toast.success(d.evidenceReceivedOn ? "Evidencias marcadas como recibidas." : "Se quitó la marca de evidencias.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="text-destructive py-6 text-sm">{error}</p>;
  if (!row) return <ResourceDetailSkeleton />;

  const title = [row.eco, row.origin, row.destination].filter(Boolean).join(" – ") || "Embarque";
  const status = shipmentStatusDisplay(row.status, row.incident);
  const extras = row.extraCosts ?? [];
  const margin = row.sale != null && row.cost != null ? row.sale - row.cost : null;

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href={base} aria-label="Volver a finanzas">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="page-heading truncate">{title}</h1>
            <Badge variant="outline" className={`shrink-0 whitespace-nowrap border-0 text-xs font-medium ${status.badgeClass}`}>{status.label}</Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-[10px] font-semibold uppercase tracking-wide sm:text-xs">
            Las tarifas y los datos se editan en la tabla de embarques.
          </p>
        </div>
      </div>

      {/* Evidencias de entrega */}
      <Card className={row.evidenceReceivedOn ? "border-green-300" : ""}>
        <CardContent className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {row.evidenceReceivedOn ? <CheckCircle2 className="size-5 shrink-0 text-green-600" /> : <Circle className="text-muted-foreground size-5 shrink-0" />}
            <div>
              <p className="text-sm font-semibold">{row.evidenceReceivedOn ? "Evidencias recibidas" : "Evidencias pendientes"}</p>
              <p className="text-muted-foreground text-xs">
                {row.evidenceReceivedOn ? `Se marcaron el ${fmtDate(row.evidenceReceivedOn)}.` : "Remisión o carta porte firmada y sellada de la entrega."}
              </p>
            </div>
          </div>
          {canMarkEvidence && (
            <Button variant={row.evidenceReceivedOn ? "outline" : "default"} onClick={toggleEvidence} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {row.evidenceReceivedOn ? "Quitar marca" : "Marcar como recibidas"}
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-semibold uppercase tracking-wider">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <InfoRow label="Cliente" value={row.client} />
            <TariffRows label="Tarifa de venta" base={row.baseSale} total={row.sale} extras={extras.map((x) => ({ concept: x.concept, amount: x.sale }))} />
            <InfoRow label="Dirección de carga" value={row.originAddress} />
            <InfoRow label="Dirección de entrega" value={row.destinationAddress} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-semibold uppercase tracking-wider">Proveedor</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <InfoRow label="Transportista" value={row.legalName} />
            <TariffRows label="Tarifa de compra" base={row.baseCost} total={row.cost} extras={extras.map((x) => ({ concept: x.concept, amount: x.cost }))} />
            <InfoRow label="Operador" value={row.operatorName} />
            <InfoRow label="Celular" value={formatPhone(row.phone)} />
            <InfoRow label="Tracto" value={row.truck} />
            <InfoRow label="Caja" value={row.trailer} />
            <InfoRow label="Unidad" value={unitLabel} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-semibold uppercase tracking-wider">Embarque</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-x-8 px-4 pb-4 lg:grid-cols-2">
          <div>
            <InfoRow label="ECO" value={row.eco} />
            <InfoRow label="Origen" value={row.origin} />
            <InfoRow label="Destino" value={row.destination} />
            <InfoRow label="Producto" value={row.product} />
            <InfoRow label="Margen" value={margin != null ? <span className={margin < 0 ? "text-destructive" : "text-green-700"}>{money(margin)}</span> : null} />
          </div>
          <div>
            <InfoRow label="Recolección" value={fmtDate(row.pickupDate)} />
            <InfoRow label="Entrega" value={fmtDate(row.deliveryDate)} />
            <InfoRow label="Incidencia" value={row.incident ? formatIncidentYesNo(row.incident) : null} />
            <InfoRow label="Tipo de incidencia" value={incidentTypeLabel} />
            <InfoRow label="Comentarios" value={row.comments} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
