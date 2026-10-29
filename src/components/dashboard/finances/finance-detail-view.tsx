"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, ChevronLeft, Circle, FileText, Loader2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoRow } from "@/components/dashboard/users/info-row";
import { ResourceDetailSkeleton } from "@/components/ui/skeletons";
import { useIncidentTypes } from "@/hooks/use-incident-types";
import { useUnitTypes } from "@/hooks/use-unit-types";
import { formatIncidentYesNo } from "@/lib/incident-yes-no";
import { IncidentTypeBadge } from "@/components/dashboard/resources/incident-type-badge";
import { formatMxn, formatPhone } from "@/lib/utils";
import { shipmentStatusDisplay } from "@/components/dashboard/resources/shipments-table";
import { KIND_SLUG, useBillingPerms } from "@/components/dashboard/billing/billing-shared";
import type { FinanceShipmentDetail } from "@/types/finance.types";
import type { PurchaseOrderData } from "./purchase-order-pdf";

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
          </div>
          <div>
            <InfoRow label="Recolección" value={fmtDate(row.pickupDate)} />
            <InfoRow label="Entrega" value={fmtDate(row.deliveryDate)} />
            <InfoRow label="Incidencia" value={row.incident ? formatIncidentYesNo(row.incident) : null} />
            <InfoRow label="Tipo de incidencia" value={row.incidentType ? <IncidentTypeBadge value={row.incidentType} types={incidentTypes} /> : null} />
            <InfoRow label="Comentarios" value={row.comments} />
          </div>
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
            <InvoiceAction shipmentId={row.id} panel={panel} />
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
            <PurchaseOrderButton row={row} unitLabel={unitLabel} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface ShipmentInvoicing {
  blocked: string | null;
  receivable: { reason: string | null };
  documents: { id: string; kind: "receivable" | "payable" }[];
}

/** "Convertir a factura": arma el borrador de la factura al cliente con las tarifas del embarque. */
function InvoiceAction({ shipmentId, panel }: { shipmentId: string; panel: "admin" | "collaborator" }) {
  const perms = useBillingPerms(panel);
  const router = useRouter();
  const [data, setData] = useState<ShipmentInvoicing | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!perms.canView) return;
    fetch(`/api/billing/shipments/${shipmentId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ShipmentInvoicing | null) => setData(d))
      .catch(() => setData(null));
  }, [perms.canView, shipmentId]);

  if (!perms.isLoaded || !perms.canView || !data) return null;
  const invoices = `/${panel}/dashboard/billing/${KIND_SLUG.receivable}`;
  const existing = data.documents.find((d) => d.kind === "receivable");
  const reason = data.blocked ?? data.receivable.reason;

  async function convert() {
    setBusy(true);
    try {
      const res = await fetch(`/api/billing/shipments/${shipmentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kinds: ["receivable"] }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string; documents?: { id: string }[] };
      if (!res.ok || !d.documents?.[0]) throw new Error(d.error ?? "No se pudo crear la factura.");
      toast.success("Factura en borrador creada.");
      router.push(`${invoices}/${d.documents[0].id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo crear la factura.");
      setBusy(false);
    }
  }

  return (
    <div className="pt-4">
      {existing ? (
        <Button variant="outline" asChild>
          <Link href={`${invoices}/${existing.id}`}>
            <Receipt className="size-4" />
            Ver factura
          </Link>
        </Button>
      ) : perms.canCreate ? (
        <>
          <Button onClick={convert} disabled={busy || Boolean(reason)}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Receipt className="size-4" />}
            Convertir a factura
          </Button>
          {reason && <p className="text-muted-foreground mt-2 text-xs">{reason}</p>}
        </>
      ) : null}
    </div>
  );
}

/** "Generar orden de compra": PDF para el transportista con la tarifa de compra. */
function PurchaseOrderButton({ row, unitLabel }: { row: FinanceShipmentDetail; unitLabel: string | null }) {
  const [busy, setBusy] = useState(false);

  async function generate() {
    const baseCost = row.baseCost ?? row.cost;
    if (!row.legalName?.trim() || baseCost == null) {
      toast.error("Para la orden de compra faltan el transportista o la tarifa de compra.");
      return;
    }
    setBusy(true);
    try {
      const data: PurchaseOrderData = {
        eco: row.eco ?? "",
        legalName: row.legalName,
        client: row.client ?? "",
        product: row.product ?? "",
        unit: unitLabel ?? "",
        pickupDate: row.pickupDate ?? "",
        deliveryDate: row.deliveryDate ?? "",
        origin: row.origin ?? "",
        destination: row.destination ?? "",
        originAddress: row.originAddress ?? "",
        destinationAddress: row.destinationAddress ?? "",
        operatorName: row.operatorName ?? "",
        truck: row.truck ?? "",
        trailer: row.trailer ?? "",
        baseCost,
        extras: (row.extraCosts ?? []).filter((x) => x.cost).map((x) => ({ concept: x.concept, amount: x.cost! })),
      };
      const [{ pdf }, { PurchaseOrderPdf }] = await Promise.all([import("@react-pdf/renderer"), import("./purchase-order-pdf")]);
      const blob = await pdf(<PurchaseOrderPdf data={data} logoUrl={`${window.location.origin}/images/logo/jtp-logistics.png`} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orden-de-compra${row.eco ? `-${row.eco.replace(/[^\w-]+/g, "")}` : ""}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar la orden de compra.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pt-4">
      <Button variant="outline" onClick={generate} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
        Generar orden de compra
      </Button>
    </div>
  );
}
