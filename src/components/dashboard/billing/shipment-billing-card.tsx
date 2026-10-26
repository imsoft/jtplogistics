"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FilePlus2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { BillingKind, Currency } from "@/lib/billing";
import type { CartaPorteSnapshot, DraftPlan } from "@/lib/shipment-billing";
import { KIND_SLUG, folioLabel, money, useBillingPerms } from "./billing-shared";

interface ShipmentBilling {
  blocked: string | null;
  receivable: { plan: DraftPlan | null; reason: string | null };
  payable: { plan: DraftPlan | null; reason: string | null };
  cartaPorte: CartaPorteSnapshot;
  clientFound: boolean;
  carrierFound: boolean;
  documents: { id: string; kind: BillingKind; draft: boolean; series: string | null; folio: string | null; total: number; currency: Currency }[];
}

const SIDES: { kind: BillingKind; title: string }[] = [
  { kind: "receivable", title: "Factura al cliente" },
  { kind: "payable", title: "Cuenta por pagar al transportista" },
];

/**
 * Facturar desde el embarque: arma el borrador de la factura al cliente y el
 * de la cuenta por pagar al transportista con las tarifas del embarque. Solo
 * lo ve quien tiene acceso a Administración.
 */
export function ShipmentBillingCard({ shipmentId, panel }: { shipmentId: string; panel: "admin" | "collaborator" }) {
  const perms = useBillingPerms(panel);
  const [data, setData] = useState<ShipmentBilling | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/billing/shipments/${shipmentId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ShipmentBilling | null) => setData(d))
      .catch(() => setData(null));
  }, [shipmentId]);

  useEffect(() => {
    if (perms.canView) load();
  }, [perms.canView, load]);

  if (!perms.isLoaded || !perms.canView) return null;
  if (data === null) return <Skeleton className="h-40 w-full" />;

  const billingBase = `/${panel}/dashboard/billing`;
  const pending = SIDES.filter((s) => !data.documents.some((d) => d.kind === s.kind) && data[s.kind].plan);

  async function createDrafts() {
    setBusy(true);
    try {
      const res = await fetch(`/api/billing/shipments/${shipmentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kinds: pending.map((s) => s.kind) }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "No se pudo crear.");
      toast.success(pending.length > 1 ? "Borradores creados." : "Borrador creado.");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo crear.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col items-start justify-between gap-3 space-y-0 pb-2 sm:flex-row">
        <CardTitle className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">Facturación</CardTitle>
        {perms.canCreate && !data.blocked && pending.length > 0 && (
          <Button size="sm" onClick={createDrafts} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <FilePlus2 className="size-4" />}
            {pending.length > 1 ? "Crear borradores" : "Crear borrador"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4">
        {data.blocked && data.documents.length === 0 && <p className="text-muted-foreground text-sm">{data.blocked}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          {SIDES.map(({ kind, title }) => {
            const doc = data.documents.find((d) => d.kind === kind);
            const side = data[kind];
            return (
              <div key={kind} className="space-y-1 rounded-lg border p-3 text-sm">
                <p className="font-medium">{title}</p>
                {doc ? (
                  <Link href={`${billingBase}/${KIND_SLUG[kind]}/${doc.id}`} className="text-primary block hover:underline">
                    {doc.draft ? "Borrador" : `Factura ${folioLabel(doc)}`} · {money(doc.total, doc.currency)}
                  </Link>
                ) : side.plan ? (
                  <>
                    <p>{side.plan.partyName}</p>
                    <p className="text-muted-foreground">
                      Total {money(side.plan.total, "MXN")}
                      {side.plan.ivaWithheld > 0 && " (con retención de 4 %)"}
                    </p>
                    {kind === "receivable" && !data.clientFound && (
                      <p className="text-xs text-amber-700 dark:text-amber-500">El cliente no está en el catálogo: la factura saldrá sin RFC.</p>
                    )}
                    {kind === "payable" && !data.carrierFound && (
                      <p className="text-xs text-amber-700 dark:text-amber-500">El transportista no está dado de alta: saldrá sin RFC.</p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">{side.reason}</p>
                )}
              </div>
            );
          })}
        </div>
        {!data.documents.some((d) => d.kind === "receivable") && data.receivable.plan && data.cartaPorte.missing.length > 0 && (
          <div className="text-sm">
            <p className="font-medium">Para la Carta Porte falta:</p>
            <ul className="text-muted-foreground list-disc pl-5">
              {data.cartaPorte.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-1 text-xs">El borrador se puede crear igual; los datos se actualizan desde la factura cuando estén completos.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
