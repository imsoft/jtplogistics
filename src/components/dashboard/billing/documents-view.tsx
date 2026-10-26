"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HandCoins, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { normalizeSearch } from "@/lib/search";
import {
  AGING_LABELS,
  BILLING_KIND_LABELS,
  DOCUMENT_STATUS,
  agingBucket,
  daysOverdue,
  r2,
  type AgingBucket,
  type BillingKind,
  type Currency,
  type DocumentStatus,
} from "@/lib/billing";
import { PaymentDialog } from "./payment-dialog";
import {
  StatusBadge,
  folioLabel,
  money,
  shortDay,
  todayKey,
  useBankAccounts,
  type BillingDocument,
} from "./billing-shared";

type Filter = "abiertas" | "todas" | DocumentStatus;

/**
 * Cuentas por cobrar (facturas a clientes) o por pagar (facturas de
 * proveedores): saldo por moneda, antigüedad y la lista para registrar
 * cobros o pagos.
 */
export function DocumentsView({
  kind,
  basePath,
  canCreate,
  canUpdate,
}: {
  kind: BillingKind;
  basePath: string;
  canCreate: boolean;
  canUpdate: boolean;
}) {
  const labels = BILLING_KIND_LABELS[kind];
  const [docs, setDocs] = useState<BillingDocument[] | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("abiertas");
  const [paying, setPaying] = useState<BillingDocument | null>(null);
  const accounts = useBankAccounts();
  const today = todayKey();

  const load = useCallback(() => {
    fetch(`/api/billing/documents?kind=${kind}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: BillingDocument[]) => setDocs(d))
      .catch(() => setDocs([]));
  }, [kind]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    const byCurrency: Record<Currency, { open: number; overdue: number }> = { MXN: { open: 0, overdue: 0 }, USD: { open: 0, overdue: 0 } };
    const aging: Record<AgingBucket, number> = { al_corriente: 0, "1_30": 0, "31_60": 0, "61_90": 0, "90_mas": 0 };
    const counts = new Map<string, number>();
    for (const d of docs ?? []) {
      counts.set(d.status, (counts.get(d.status) ?? 0) + 1);
      if (d.balance <= 0 || d.status === "cancelada") continue;
      byCurrency[d.currency].open = r2(byCurrency[d.currency].open + d.balance);
      if (d.status === "vencida") byCurrency[d.currency].overdue = r2(byCurrency[d.currency].overdue + d.balance);
      // La antigüedad se cuenta en pesos para poder sumar las dos monedas.
      aging[agingBucket(d.dueDate, today)] += d.currency === "USD" ? d.balance * d.exchangeRate : d.balance;
    }
    return { byCurrency, aging, counts };
  }, [docs, today]);

  const visible = useMemo(() => {
    const q = normalizeSearch(search);
    return (docs ?? []).filter((d) => {
      if (filter === "abiertas" && !(d.balance > 0 && d.status !== "cancelada")) return false;
      if (filter !== "abiertas" && filter !== "todas" && d.status !== filter) return false;
      if (!q) return true;
      return [d.partyName, d.partyRfc, folioLabel(d), d.uuid, d.concept, d.reference].some((v) => normalizeSearch(v ?? "").includes(q));
    });
  }, [docs, search, filter]);

  if (docs === null) {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const openCount = docs.filter((d) => d.balance > 0 && d.status !== "cancelada").length;
  const chip = (value: Filter, label: string, count: number) => (
    <Button key={value} type="button" size="sm" variant={filter === value ? "secondary" : "outline"} onClick={() => setFilter(value)}>
      {label} ({count})
    </Button>
  );

  return (
    <div className="min-w-0 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="py-0">
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              {kind === "receivable" ? "Por cobrar" : "Por pagar"}
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums">{money(summary.byCurrency.MXN.open, "MXN")}</p>
            {summary.byCurrency.USD.open > 0 && <p className="text-lg font-bold tabular-nums">{money(summary.byCurrency.USD.open, "USD")}</p>}
          </CardContent>
        </Card>
        <Card className={cn("py-0", (summary.byCurrency.MXN.overdue > 0 || summary.byCurrency.USD.overdue > 0) && "border-destructive/40")}>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Vencido</p>
            <p className={cn("mt-1 text-xl font-bold tabular-nums", summary.byCurrency.MXN.overdue > 0 && "text-destructive")}>
              {money(summary.byCurrency.MXN.overdue, "MXN")}
            </p>
            {summary.byCurrency.USD.overdue > 0 && (
              <p className="text-destructive text-lg font-bold tabular-nums">{money(summary.byCurrency.USD.overdue, "USD")}</p>
            )}
          </CardContent>
        </Card>
        <Card className="py-0 sm:col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Antigüedad de saldos (en pesos)</p>
            <ul className="mt-1 space-y-0.5 text-xs">
              {(Object.keys(AGING_LABELS) as AgingBucket[]).map((b) => (
                <li key={b} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{AGING_LABELS[b]}</span>
                  <span className={cn("tabular-nums", b !== "al_corriente" && summary.aging[b] > 0 && "text-destructive font-medium")}>
                    {money(r2(summary.aging[b]), "MXN")}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="w-full space-y-1.5 sm:max-w-sm">
        <Label htmlFor="billing-search">Buscar</Label>
        <Input id="billing-search" value={search} onChange={(e) => setSearch(e.target.value)} />
        <p className="text-muted-foreground text-xs">{labels.party}, RFC, folio, folio fiscal o concepto.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {chip("abiertas", "Con saldo", openCount)}
        {(["vencida", "parcial", "pendiente", "pagada", "borrador", "cancelada"] as DocumentStatus[]).map((s) =>
          chip(s, DOCUMENT_STATUS[s].label, summary.counts.get(s) ?? 0)
        )}
        {chip("todas", "Todas", docs.length)}
      </div>

      {visible.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          {docs.length === 0
            ? `Todavía no hay facturas capturadas.${canCreate ? " Captura la primera con «Nueva factura»." : ""}`
            : "Ninguna factura coincide con los filtros."}
        </p>
      ) : (
        <div className="@container/table w-full overflow-x-auto rounded-md border">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="bg-muted/40 border-b">
                <th className="px-4 py-2 text-left font-medium">Folio</th>
                <th className="px-4 py-2 text-left font-medium">{labels.party}</th>
                <th className="hidden px-4 py-2 text-left font-medium @6xl/table:table-cell">Fecha</th>
                <th className="px-4 py-2 text-left font-medium">Vence</th>
                <th className="hidden px-4 py-2 text-right font-medium @5xl/table:table-cell">Total</th>
                <th className="px-4 py-2 text-right font-medium">Saldo</th>
                <th className="px-4 py-2 text-left font-medium">Estado</th>
                {canUpdate && <th className="w-24 px-2 py-2" />}
              </tr>
            </thead>
            <tbody>
              {visible.map((d) => {
                const late = d.status === "vencida" ? daysOverdue(d.dueDate, today) : 0;
                return (
                  <tr key={d.id} className="border-b align-top last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`${basePath}/${d.id}`} className="text-primary font-mono text-xs font-medium hover:underline">
                        {folioLabel(d)}
                      </Link>
                      {d.source === "alegra" && <span className="text-muted-foreground block text-[11px]">De Alegra</span>}
                      {d.shipmentEco && <span className="text-muted-foreground block text-[11px]">ECO {d.shipmentEco}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block max-w-64 truncate font-medium" title={d.partyName}>{d.partyName}</span>
                      {d.concept && <span className="text-muted-foreground block max-w-64 truncate text-xs" title={d.concept}>{d.concept}</span>}
                    </td>
                    <td className="text-muted-foreground hidden px-4 py-3 whitespace-nowrap @6xl/table:table-cell">{shortDay(d.issueDate)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={cn(late > 0 && "text-destructive font-medium")}>{shortDay(d.dueDate)}</span>
                      {late > 0 && <span className="text-destructive block text-xs">{late} días de atraso</span>}
                    </td>
                    <td className="hidden px-4 py-3 text-right whitespace-nowrap tabular-nums @5xl/table:table-cell">{money(d.total, d.currency)}</td>
                    <td className="px-4 py-3 text-right font-medium whitespace-nowrap tabular-nums">{money(d.balance, d.currency)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.status} />
                    </td>
                    {canUpdate && (
                      <td className="px-2 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {d.balance > 0 && d.status !== "cancelada" && (
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setPaying(d)}>
                              <HandCoins className="size-3.5" />
                              {labels.payment}
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="size-7" asChild>
                            <Link href={`${basePath}/${d.id}/edit`} aria-label={`Editar ${folioLabel(d)}`}>
                              <Pencil className="size-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <PaymentDialog
        doc={paying}
        accounts={accounts ?? []}
        onClose={() => setPaying(null)}
        onSaved={() => {
          setPaying(null);
          load();
        }}
      />
    </div>
  );
}
