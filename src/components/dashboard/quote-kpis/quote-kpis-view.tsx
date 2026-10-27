"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMxn } from "@/lib/utils";
import { QUOTE_STATUS_CONFIG } from "@/lib/constants/quote-status";
import { QUOTE_REJECTION_LABELS, type QuoteRejectionReason } from "@/lib/quote-rejection";
import type { QuoteKpis } from "@/lib/quote-kpis";

interface KpisResponse extends QuoteKpis {
  from: string;
  to: string;
  users: { id: string; name: string }[];
}

const PERIOD_OPTIONS = [
  { value: "month", label: "Este mes" },
  { value: "3m", label: "Últimos 3 meses" },
  { value: "6m", label: "Últimos 6 meses" },
  { value: "12m", label: "Últimos 12 meses" },
  { value: "ytd", label: "Este año" },
  { value: "all", label: "Todo" },
];

const KIND_OPTIONS = [
  { value: "all", label: "Terrestres y marítimas" },
  { value: "terrestre", label: "Solo terrestres" },
  { value: "maritima", label: "Solo marítimas" },
];

// Dos primeras posiciones de la paleta categórica validada; en modo oscuro
// tienen su propio paso, no una inversión automática.
const SERIES_STYLE =
  "[--kpi-1:#2a78d6] [--kpi-2:#eb6834] dark:[--kpi-1:#3987e5] dark:[--kpi-2:#d95926]";

const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;
const money = (v: number) => `$${formatMxn(v)}`;
const compactMoney = (v: number) =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)} M` : v >= 1000 ? `$${Math.round(v / 1000)} mil` : `$${Math.round(v)}`;

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("es-MX", { month: "short", year: "2-digit", timeZone: "UTC" });
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="py-0">
      <CardContent className="p-4">
        <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
        {hint && <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>}
      </CardContent>
    </Card>
  );
}

/** Barras horizontales en HTML: nombre y número siempre escritos junto a la barra. */
function BarList({ items, total }: { items: { label: string; value: number }[]; total: number }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.label} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span>{i.label}</span>
            <span className="text-muted-foreground tabular-nums">
              {i.value}
              {total > 0 && ` · ${pct(i.value / total)}`}
            </span>
          </div>
          <div className="bg-muted h-2 rounded-full">
            <div className="h-2 rounded-full bg-[var(--kpi-1)]" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  format: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold">{label ? monthLabel(label) : ""}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-sm" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold tabular-nums">{format(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

/**
 * KPIs de cotizaciones: embudo, tasa de cierre, montos y desgloses por
 * colaborador, cliente, ruta y motivo de rechazo.
 */
export function QuoteKpisView() {
  const [period, setPeriod] = useState("6m");
  const [kind, setKind] = useState("all");
  const [user, setUser] = useState("");
  const [data, setData] = useState<KpisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const qs = new URLSearchParams({ period, kind, ...(user ? { user } : {}) });
    fetch(`/api/quote-kpis?${qs}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("No se pudieron cargar los KPIs."))))
      .then((d: KpisResponse) => {
        setData(d);
        setError(null);
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => ctrl.abort();
  }, [period, kind, user]);

  const monthly = useMemo(() => data?.monthly ?? [], [data]);

  return (
    <div className={`min-w-0 space-y-6 ${SERIES_STYLE}`}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Periodo</Label>
          <AppSelect value={period} onValueChange={(v) => setPeriod(v || "6m")} options={PERIOD_OPTIONS} className="w-full" />
        </div>
        <div className="space-y-1.5">
          <Label>Tipo de cotización</Label>
          <AppSelect value={kind} onValueChange={(v) => setKind(v || "all")} options={KIND_OPTIONS} className="w-full" />
        </div>
        <div className="space-y-1.5">
          <Label>Colaborador</Label>
          <AppSelect
            value={user}
            onValueChange={(v) => setUser(v || "")}
            options={(data?.users ?? []).map((u) => ({ value: u.id, label: u.name }))}
            className="w-full"
          />
          <p className="text-muted-foreground text-xs">Vacío: todo el equipo.</p>
        </div>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {!data ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Cotizaciones emitidas"
              value={String(data.totals.emitted)}
              hint={data.totals.drafts > 0 ? `Más ${data.totals.drafts} en borrador, que no cuentan.` : "Sin contar borradores."}
            />
            <Stat label="Tasa de cierre" value={pct(data.totals.closeRate)} hint={`${data.totals.accepted} aceptadas de ${data.totals.emitted} emitidas.`} />
            <Stat label="Monto ganado" value={money(data.totals.wonAmount)} hint={`De ${money(data.totals.quotedAmount)} cotizados.`} />
            <Stat label="Ticket promedio" value={money(data.totals.avgTicket)} hint="Por cotización terrestre emitida." />
          </div>
          <p className="text-muted-foreground -mt-3 text-xs">
            Los montos suman las tarifas de las cotizaciones terrestres. Las marítimas cuentan en el embudo y la tasa de
            cierre, pero no en montos: calculan impuestos de importación, no una tarifa de venta.
          </p>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Embudo</CardTitle>
                <CardDescription>Cómo están hoy las cotizaciones emitidas en el periodo.</CardDescription>
              </CardHeader>
              <CardContent>
                <BarList
                  total={data.totals.emitted}
                  items={data.funnel.map((f) => ({ label: QUOTE_STATUS_CONFIG[f.status].label, value: f.count }))}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Por qué se pierden</CardTitle>
                <CardDescription>Motivo registrado al marcar una cotización como rechazada.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.rejectionReasons.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No hay cotizaciones rechazadas en el periodo.</p>
                ) : (
                  <BarList
                    total={data.totals.rejected}
                    items={data.rejectionReasons.map((r) => ({
                      label:
                        r.reason === "sin_motivo"
                          ? "Sin motivo registrado"
                          : (QUOTE_REJECTION_LABELS[r.reason as QuoteRejectionReason] ?? r.reason),
                      value: r.count,
                    }))}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cotizaciones por mes</CardTitle>
              <CardDescription>Emitidas contra aceptadas, por mes en que se hizo la cotización.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthly} margin={{ left: 0, right: 8, top: 8, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} stroke="var(--muted-foreground)" />
                  <Tooltip content={<ChartTooltip format={(v) => String(v)} />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="emitted" name="Emitidas" fill="var(--kpi-1)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="accepted" name="Aceptadas" fill="var(--kpi-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Montos por mes</CardTitle>
              <CardDescription>Cotizado contra ganado (cotizaciones terrestres).</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthly} margin={{ left: 8, right: 8, top: 8, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tickFormatter={compactMoney} tick={{ fontSize: 11 }} width={64} stroke="var(--muted-foreground)" />
                  <Tooltip content={<ChartTooltip format={money} />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="quotedAmount" name="Cotizado" fill="var(--kpi-1)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="wonAmount" name="Ganado" fill="var(--kpi-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Por colaborador</CardTitle>
              <CardDescription>Quién hizo cada cotización.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <KpiTable
                empty="No hay cotizaciones en el periodo."
                head={["Colaborador", "Emitidas", "Aceptadas", "Tasa de cierre", "Cotizado", "Ganado"]}
                rows={data.byUser.map((u) => [u.name, u.emitted, u.accepted, pct(u.closeRate), money(u.quotedAmount), money(u.wonAmount)])}
              />
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle className="text-base">Clientes más cotizados</CardTitle>
                <CardDescription>Los 10 con más cotizaciones en el periodo.</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <KpiTable
                  empty="No hay cotizaciones en el periodo."
                  head={["Cliente", "Emitidas", "Aceptadas", "Tasa", "Ganado"]}
                  rows={data.byClient.map((c) => [c.name, c.emitted, c.accepted, pct(c.closeRate), money(c.wonAmount)])}
                />
              </CardContent>
            </Card>
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle className="text-base">Rutas más cotizadas</CardTitle>
                <CardDescription>Las 10 rutas terrestres que más aparecen en cotizaciones.</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <KpiTable
                  empty="No hay cotizaciones terrestres en el periodo."
                  head={["Ruta", "Unidad", "Veces", "Ganadas", "Tarifa prom."]}
                  rows={data.byRoute.map((r) => [r.route, r.unit, r.timesQuoted, r.timesWon, money(r.avgCost)])}
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function KpiTable({ head, rows, empty }: { head: string[]; rows: (string | number)[][]; empty: string }) {
  if (rows.length === 0) return <p className="text-muted-foreground px-6 text-sm">{empty}</p>;
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-max text-sm md:min-w-0">
        <thead>
          <tr className="bg-muted/40 border-y">
            {head.map((h, i) => (
              <th key={h} className={`px-4 py-2 font-medium ${i === 0 ? "text-left" : "text-right"}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b last:border-0">
              {r.map((cell, i) => (
                <td key={i} className={`px-4 py-2 ${i === 0 ? "max-w-72 truncate font-medium" : "text-right tabular-nums"}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
