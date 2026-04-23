"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import type { FinancesAnalytics, RouteMargin, LegalNameCount } from "@/app/api/admin/finances/analytics/route";

const MAX_ROUTES = 20;

function fmtMxn(v: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);
}

function RouteTooltip({ active, payload }: { active?: boolean; payload?: { payload: RouteMargin }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-semibold mb-1">{d.route}</p>
      <p className="text-muted-foreground">Viajes: {d.count}</p>
      <p className="text-muted-foreground">Venta total: {fmtMxn(d.totalSale)}</p>
      <p className="text-muted-foreground">Costo total: {fmtMxn(d.totalCost)}</p>
      <p className={`font-medium ${d.margin >= 0 ? "text-emerald-600" : "text-destructive"}`}>
        Margen: {fmtMxn(d.margin)}
      </p>
    </div>
  );
}

function LegalTooltip({ active, payload }: { active?: boolean; payload?: { payload: LegalNameCount }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-semibold mb-1">{d.legalName}</p>
      <p className="text-muted-foreground">Embarques: {d.count}</p>
    </div>
  );
}

export default function FinancesAnalyticsPage() {
  const [data, setData] = useState<FinancesAnalytics | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/admin/finances/analytics")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: FinancesAnalytics | null) => { setData(d); setIsLoaded(true); })
      .catch(() => setIsLoaded(true));
  }, []);

  const topRoutes = data?.routeMargins.slice(0, MAX_ROUTES) ?? [];
  const bottomRoutes = data?.routeMargins.slice(-10).reverse() ?? [];
  const legalCounts = data?.legalNameCounts ?? [];

  // Rutas con datos de margen (solo las que tienen sale o cost)
  const routesWithData = topRoutes.filter((r) => r.totalSale > 0 || r.totalCost > 0);
  const lossMakers = data?.routeMargins.filter((r) => r.margin < 0) ?? [];

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
            <h1 className="page-heading">Análisis de rentabilidad</h1>
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
              Margen por ruta y razón social con más embarques
            </p>
          </div>
        </div>
      </div>

      {!isLoaded ? (
        <p className="text-sm text-muted-foreground">Cargando datos…</p>
      ) : !data ? (
        <p className="text-sm text-destructive">No se pudieron cargar los datos.</p>
      ) : (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rutas analizadas</p>
                <p className="mt-1 text-2xl font-bold">{data.routeMargins.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rutas rentables</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">
                  {data.routeMargins.filter((r) => r.margin > 0).length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rutas a pérdida</p>
                <p className="mt-1 text-2xl font-bold text-destructive">{lossMakers.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Margen total</p>
                <p className={`mt-1 text-2xl font-bold ${data.routeMargins.reduce((s, r) => s + r.margin, 0) >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                  {fmtMxn(data.routeMargins.reduce((s, r) => s + r.margin, 0))}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Margen por ruta — top rentables */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Rutas más rentables (top {Math.min(MAX_ROUTES, routesWithData.length)})
              </CardTitle>
              <CardDescription className="text-xs">
                Margen = venta − costo acumulado por ruta. Verde = ganancia · Rojo = pérdida
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              {routesWithData.length === 0 ? (
                <p className="px-4 text-sm text-muted-foreground">Sin datos de venta/costo registrados.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(300, routesWithData.length * 36)}>
                  <BarChart data={routesWithData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => fmtMxn(v)} tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="route"
                      width={180}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: string) => v.length > 28 ? v.slice(0, 26) + "…" : v}
                    />
                    <Tooltip content={<RouteTooltip />} />
                    <ReferenceLine x={0} stroke="hsl(var(--border))" />
                    <Bar dataKey="margin" radius={[0, 4, 4, 0]}>
                      {routesWithData.map((entry, i) => (
                        <Cell key={i} fill={entry.margin >= 0 ? "hsl(142 71% 45%)" : "hsl(0 72% 51%)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Rutas a pérdida */}
          {lossMakers.length > 0 && (
            <Card className="border-destructive/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-destructive">
                  Rutas operando a pérdida ({lossMakers.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Estas rutas tienen costo mayor a la venta registrada.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                        <th className="px-4 py-2 text-left font-medium">Ruta</th>
                        <th className="px-4 py-2 text-right font-medium">Viajes</th>
                        <th className="px-4 py-2 text-right font-medium">Venta</th>
                        <th className="px-4 py-2 text-right font-medium">Costo</th>
                        <th className="px-4 py-2 text-right font-medium">Margen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lossMakers.map((r, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-4 py-2.5 font-medium">{r.route}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{r.count}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtMxn(r.totalSale)}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtMxn(r.totalCost)}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-destructive">{fmtMxn(r.margin)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Razón social con más embarques */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Razón social con más embarques (top {legalCounts.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Transportistas / proveedores que más rutas han movido.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              {legalCounts.length === 0 ? (
                <p className="px-4 text-sm text-muted-foreground">Sin datos de razón social registrados.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(250, legalCounts.length * 36)}>
                  <BarChart data={legalCounts} layout="vertical" margin={{ left: 8, right: 32, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="legalName"
                      width={200}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: string) => v.length > 30 ? v.slice(0, 28) + "…" : v}
                    />
                    <Tooltip content={<LegalTooltip />} />
                    <Bar dataKey="count" fill="hsl(221 83% 53%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
