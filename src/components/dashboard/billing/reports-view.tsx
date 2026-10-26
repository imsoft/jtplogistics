"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileDown, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AppSelect } from "@/components/ui/app-select";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { monthRange } from "@/lib/billing-reports";
import { cashFlowSheets, monthlyExportSheets, statementSheets } from "@/lib/billing-reports-excel";
import { downloadXlsxWorkbook } from "@/lib/excel-export";
import type { BillingKind } from "@/lib/billing";
import type { CashFlowReport, MonthlyExport, StatementReport } from "@/lib/billing-reports-server";
import { money, todayKey } from "./billing-shared";

/** Un reporte ya pedido, junto con la consulta que lo produjo. */
type Loaded<T> = { key: string; data: T | null; error: string | null };

/** Pide el reporte cada vez que cambia la consulta; `null` mientras no hay qué pedir. */
function useReport<T>(query: string | null) {
  const [state, setState] = useState<Loaded<T> | null>(null);
  useEffect(() => {
    if (!query) return;
    let alive = true;
    fetch(`/api/billing/reports?${query}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error((d as { error?: string }).error ?? "No se pudo generar el reporte.");
        return d as T;
      })
      .then((data) => alive && setState({ key: query, data, error: null }))
      .catch((e: Error) => alive && setState({ key: query, data: null, error: e.message }));
    return () => {
      alive = false;
    };
  }, [query]);
  const current = query && state?.key === query ? state : null;
  return { data: current?.data ?? null, error: current?.error ?? null, loading: Boolean(query) && !current };
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** "1 gasto", "3 gastos". */
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const logoUrl = () => `${window.location.origin}/images/logo/jtp-logistics.png`;
const safeName = (v: string) => v.replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 60);

function monthTitle(month: string) {
  const [y, m] = month.split("-").map(Number);
  const name = new Intl.DateTimeFormat("es-MX", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 15)));
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
}

function Totals({ items }: { items: { label: string; value: string; tone?: "bad" }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className="rounded-lg border p-3">
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">{i.label}</p>
          <p className={cn("mt-1 font-bold tabular-nums", i.tone === "bad" && "text-destructive")}>{i.value}</p>
        </div>
      ))}
    </div>
  );
}

export function ReportsView() {
  const { data: session } = useSession();
  const generatedBy = session?.user.name ?? "JTP Logistics";
  return (
    <div className="min-w-0 space-y-6">
      <StatementCard generatedBy={generatedBy} />
      <CashFlowCard generatedBy={generatedBy} />
      <ExportCard />
    </div>
  );
}

function StatementCard({ generatedBy }: { generatedBy: string }) {
  const today = todayKey();
  const [kind, setKind] = useState<BillingKind>("receivable");
  const [party, setParty] = useState("");
  const [parties, setParties] = useState<{ kind: BillingKind; names: string[] } | null>(null);
  const [from, setFrom] = useState(`${today.slice(0, 4)}-01-01`);
  const [to, setTo] = useState(today);
  const [busy, setBusy] = useState<"pdf" | "xlsx" | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/billing/parties?kind=${kind}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d: { name: string }[]) => alive && setParties({ kind, names: Array.isArray(d) ? d.map((p) => p.name) : [] }))
      .catch(() => alive && setParties({ kind, names: [] }));
    return () => {
      alive = false;
    };
  }, [kind]);

  const names = parties?.kind === kind ? parties.names : null;
  const query = party && from && to && from <= to
    ? new URLSearchParams({ type: "statement", kind, party, from, to }).toString()
    : null;
  const { data, error, loading } = useReport<StatementReport>(query);

  async function downloadPdf() {
    if (!data) return;
    setBusy("pdf");
    try {
      const [{ pdf }, { StatementPdf }] = await Promise.all([import("@react-pdf/renderer"), import("./report-pdfs")]);
      const blob = await pdf(<StatementPdf report={data} logoUrl={logoUrl()} generatedBy={generatedBy} />).toBlob();
      saveBlob(blob, `Estado de cuenta ${safeName(data.party.name)} ${from} a ${to}.pdf`);
    } catch (e) {
      toast.error(`No se pudo generar el PDF: ${e instanceof Error ? e.message : "error desconocido"}`);
    } finally {
      setBusy(null);
    }
  }

  async function downloadXlsx() {
    if (!data) return;
    setBusy("xlsx");
    try {
      await downloadXlsxWorkbook(`Estado de cuenta ${safeName(data.party.name)} ${from} a ${to}.xlsx`, statementSheets(data));
    } catch {
      toast.error("No se pudo generar el Excel.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Estado de cuenta</CardTitle>
        <CardDescription>
          De un cliente o de un proveedor: saldo al inicio, facturas, cobros o pagos del periodo y lo que queda pendiente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>De</Label>
            <AppSelect
              value={kind}
              onValueChange={(v) => {
                setKind(v === "payable" ? "payable" : "receivable");
                setParty("");
              }}
              options={[
                { value: "receivable", label: "Un cliente" },
                { value: "payable", label: "Un proveedor" },
              ]}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label>{kind === "receivable" ? "Cliente" : "Proveedor"}</Label>
            {names === null ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <AppSelect value={party} onValueChange={setParty} options={names.map((n) => ({ value: n, label: n }))} className="w-full" />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="st-from">Desde</Label>
            <DatePicker id="st-from" value={from} onChange={setFrom} max={to} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="st-to">Hasta</Label>
            <DatePicker id="st-to" value={to} onChange={setTo} min={from} />
          </div>
        </div>

        {!party ? (
          <p className="text-muted-foreground text-sm">Elige {kind === "receivable" ? "el cliente" : "el proveedor"} para ver su estado de cuenta.</p>
        ) : loading ? (
          <Skeleton className="h-20 w-full" />
        ) : error ? (
          <p className="text-destructive text-sm">{error}</p>
        ) : data && data.currencies.length === 0 ? (
          <p className="text-muted-foreground text-sm">No tiene facturas en el periodo ni saldo anterior.</p>
        ) : (
          data?.currencies.map((c) => (
            <div key={c.currency} className="space-y-2">
              {data.currencies.length > 1 && <p className="text-sm font-medium">En {c.currency === "MXN" ? "pesos" : "dólares"}</p>}
              <Totals
                items={[
                  { label: "Saldo inicial", value: money(c.opening, c.currency) },
                  { label: "Facturado", value: money(c.charges, c.currency) },
                  { label: kind === "receivable" ? "Cobrado" : "Pagado", value: money(c.credits, c.currency) },
                  { label: "Saldo final", value: money(c.closing, c.currency) },
                ]}
              />
              {c.open.some((o) => o.daysOverdue > 0) && (
                <p className="text-destructive text-xs">
                  {count(c.open.filter((o) => o.daysOverdue > 0).length, "factura vencida", "facturas vencidas")} al cierre del periodo.
                </p>
              )}
            </div>
          ))
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={downloadPdf} disabled={!data || data.currencies.length === 0 || busy !== null}>
            {busy === "pdf" ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
            Descargar PDF
          </Button>
          <Button variant="outline" onClick={downloadXlsx} disabled={!data || data.currencies.length === 0 || busy !== null}>
            {busy === "xlsx" ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
            Descargar Excel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CashFlowCard({ generatedBy }: { generatedBy: string }) {
  const [month, setMonth] = useState(todayKey().slice(0, 7));
  const [busy, setBusy] = useState<"pdf" | "xlsx" | null>(null);
  const range = /^\d{4}-\d{2}$/.test(month) ? monthRange(month) : null;
  const query = range ? new URLSearchParams({ type: "cash-flow", ...range }).toString() : null;
  const { data, error, loading } = useReport<CashFlowReport>(query);

  async function downloadPdf() {
    if (!data) return;
    setBusy("pdf");
    try {
      const [{ pdf }, { CashFlowPdf }] = await Promise.all([import("@react-pdf/renderer"), import("./report-pdfs")]);
      const blob = await pdf(<CashFlowPdf report={data} title={monthTitle(month)} logoUrl={logoUrl()} generatedBy={generatedBy} />).toBlob();
      saveBlob(blob, `Flujo de efectivo ${month}.pdf`);
    } catch (e) {
      toast.error(`No se pudo generar el PDF: ${e instanceof Error ? e.message : "error desconocido"}`);
    } finally {
      setBusy(null);
    }
  }

  async function downloadXlsx() {
    if (!data) return;
    setBusy("xlsx");
    try {
      await downloadXlsxWorkbook(`Flujo de efectivo ${month}.xlsx`, cashFlowSheets(data));
    } catch {
      toast.error("No se pudo generar el Excel.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Flujo de efectivo</CardTitle>
        <CardDescription>Cuánto entró y salió de las cuentas en el mes, de dónde vino y a dónde se fue.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cf-month">Mes</Label>
          <Input id="cf-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto" />
        </div>

        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : error ? (
          <p className="text-destructive text-sm">{error}</p>
        ) : data && data.currencies.length === 0 ? (
          <p className="text-muted-foreground text-sm">Todavía no hay cuentas de banco dadas de alta.</p>
        ) : (
          data?.currencies.map((c) => (
            <div key={c.currency} className="space-y-2">
              {data.currencies.length > 1 && <p className="text-sm font-medium">En {c.currency === "MXN" ? "pesos" : "dólares"}</p>}
              <Totals
                items={[
                  { label: "Saldo inicial", value: money(c.opening, c.currency) },
                  { label: "Entradas", value: money(c.inflows, c.currency) },
                  { label: "Salidas", value: money(-c.outflows, c.currency) },
                  { label: "Saldo final", value: money(c.closing, c.currency), tone: c.closing < 0 ? "bad" : undefined },
                ]}
              />
            </div>
          ))
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={downloadPdf} disabled={!data || data.currencies.length === 0 || busy !== null}>
            {busy === "pdf" ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
            Descargar PDF
          </Button>
          <Button variant="outline" onClick={downloadXlsx} disabled={!data || data.currencies.length === 0 || busy !== null}>
            {busy === "xlsx" ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
            Descargar Excel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ExportCard() {
  const [month, setMonth] = useState(todayKey().slice(0, 7));
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ month: string; counts: string } | null>(null);

  async function download() {
    if (!/^\d{4}-\d{2}$/.test(month)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/billing/reports?${new URLSearchParams({ type: "export", ...monthRange(month) })}`);
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((d as { error?: string }).error ?? "No se pudo generar.");
      const data = d as MonthlyExport;
      await downloadXlsxWorkbook(`Administración JTP ${month}.xlsx`, monthlyExportSheets(data));
      const emitted = data.documents.filter((x) => x.kind === "receivable").length;
      const received = data.documents.length - emitted;
      setLast({
        month,
        counts: [
          count(emitted, "factura emitida", "facturas emitidas"),
          count(received, "recibida", "recibidas"),
          count(data.payments.length, "cobro o pago", "cobros y pagos"),
          count(data.movements.length, "movimiento de banco", "movimientos de banco"),
        ].join(", ") + ` y ${count(data.expenses.length, "gasto", "gastos")}.`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo generar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Exportación para el contador</CardTitle>
        <CardDescription>
          Un Excel con todo lo del mes, una hoja por tema: facturas emitidas y recibidas, cobros, pagos, movimientos de banco y gastos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ex-month">Mes</Label>
          <Input id="ex-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto" />
        </div>
        {last && last.month === month && <p className="text-muted-foreground text-sm">Se descargó con {last.counts}</p>}
        <Button onClick={download} disabled={busy || !month}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
          Descargar Excel del mes
        </Button>
      </CardContent>
    </Card>
  );
}
