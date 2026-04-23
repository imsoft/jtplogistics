"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, Star, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CarrierRating } from "@/app/api/admin/carriers/ratings/route";

// ── Star display ─────────────────────────────────────────────────────────────

function StarRating({ stars, size = "sm" }: { stars: number; size?: "sm" | "lg" }) {
  const s = size === "lg" ? "size-5" : "size-3.5";
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${s} ${n <= stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </span>
  );
}

// ── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ label, value, color }: { label: string; value: number | null; color: string }) {
  if (value === null) {
    return (
      <div className="space-y-0.5">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{label}</span>
          <span>N/A</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted" />
      </div>
    );
  }
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// ── Score badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 90 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" :
    score >= 75 ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" :
    score >= 58 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" :
    "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${color}`}>
      {score}
    </span>
  );
}

// ── Carrier card ─────────────────────────────────────────────────────────────

function CarrierCard({ carrier, rank }: { carrier: CarrierRating; rank: number }) {
  return (
    <Card className="relative overflow-hidden transition-shadow hover:shadow-md">
      {/* Rank ribbon */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{
          background: rank === 1 ? "#f59e0b" : rank === 2 ? "#94a3b8" : rank === 3 ? "#b45309" : "hsl(var(--border))"
        }}
      />
      <CardContent className="pl-5 pr-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Header row */}
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-bold text-muted-foreground tabular-nums">#{rank}</span>
              <p className="font-semibold text-sm leading-tight truncate max-w-[240px]" title={carrier.legalName}>
                {carrier.legalName}
              </p>
              <ScoreBadge score={carrier.overallScore} />
            </div>

            {/* Stars + shipments count */}
            <div className="flex items-center gap-3 mb-3">
              <StarRating stars={carrier.stars} />
              <span className="text-xs text-muted-foreground">
                {carrier.totalShipments} embarque{carrier.totalShipments !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Score bars */}
            <div className="space-y-1.5">
              <ScoreBar
                label="Puntualidad"
                value={carrier.punctualityScore}
                color="bg-blue-500"
              />
              <ScoreBar
                label="Sin incidencias"
                value={carrier.incidentFreeScore}
                color="bg-emerald-500"
              />
              <ScoreBar
                label="Tasa de entrega"
                value={carrier.deliveryRateScore}
                color="bg-violet-500"
              />
            </div>
          </div>

          {/* Right side stats */}
          <div className="shrink-0 flex flex-col items-end gap-1.5 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-blue-400 inline-block" />
              {carrier.delivered} entregado{carrier.delivered !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-purple-400 inline-block" />
              {carrier.deliveredWithDelay} con retraso
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-red-400 inline-block" />
              {carrier.notDelivered} no entregado{carrier.notDelivered !== 1 ? "s" : ""}
            </span>
            {carrier.withIncident > 0 && (
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-amber-400 inline-block" />
                {carrier.withIncident} incidencia{carrier.withIncident !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const STAR_FILTER_OPTIONS = [
  { value: "all", label: "Todas las estrellas" },
  { value: "5", label: "★★★★★  Excelente" },
  { value: "4", label: "★★★★☆  Muy bueno" },
  { value: "3", label: "★★★☆☆  Regular" },
  { value: "2", label: "★★☆☆☆  Deficiente" },
  { value: "1", label: "★☆☆☆☆  Crítico" },
];

export default function CarrierRatingsPage() {
  const [ratings, setRatings] = useState<CarrierRating[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [starFilter, setStarFilter] = useState("all");
  const [minShipments, setMinShipments] = useState("1");

  useEffect(() => {
    fetch("/api/admin/carriers/ratings")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: CarrierRating[]) => { setRatings(data); setIsLoaded(true); })
      .catch(() => setIsLoaded(true));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = parseInt(minShipments, 10) || 1;
    return ratings.filter((r) => {
      if (q && !r.legalName.toLowerCase().includes(q)) return false;
      if (starFilter !== "all" && r.stars !== parseInt(starFilter, 10)) return false;
      if (r.totalShipments < min) return false;
      return true;
    });
  }, [ratings, search, starFilter, minShipments]);

  // KPIs
  const avgScore = ratings.length > 0
    ? Math.round(ratings.reduce((s, r) => s + r.overallScore, 0) / ratings.length)
    : null;
  const topCarriers = ratings.filter((r) => r.stars >= 4).length;
  const criticalCarriers = ratings.filter((r) => r.stars <= 2).length;

  return (
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/admin/dashboard/providers" aria-label="Volver a proveedores">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="page-heading">Rating de transportistas</h1>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Puntualidad · Incidencias · Tasa de entrega
          </p>
        </div>
      </div>

      {!isLoaded ? (
        <p className="text-sm text-muted-foreground">Calculando ratings…</p>
      ) : ratings.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-8 text-center">
          No hay embarques con razón social registrada para calcular ratings.
        </p>
      ) : (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Transportistas</p>
                <p className="mt-1 text-2xl font-bold">{ratings.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Score promedio</p>
                <p className="mt-1 text-2xl font-bold">{avgScore ?? "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">4–5 estrellas</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">{topCarriers}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">1–2 estrellas</p>
                <p className="mt-1 text-2xl font-bold text-destructive">{criticalCarriers}</p>
              </CardContent>
            </Card>
          </div>

          {/* Methodology note */}
          <Card className="bg-muted/40 border-dashed">
            <CardContent className="px-4 py-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Metodología:</strong>{" "}
                Puntualidad 40% (entregado = 100 pts, con retraso = 50 pts, no entregado = 0 pts) ·
                Sin incidencias 30% ·
                Tasa de entrega 30%.{" "}
                Solo se consideran embarques con razón social registrada.
              </p>
            </CardContent>
          </Card>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={starFilter} onValueChange={setStarFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAR_FILTER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={minShipments} onValueChange={setMinShipments}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Mín. 1 embarque</SelectItem>
                <SelectItem value="3">Mín. 3 embarques</SelectItem>
                <SelectItem value="5">Mín. 5 embarques</SelectItem>
                <SelectItem value="10">Mín. 10 embarques</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results count */}
          <p className="text-xs text-muted-foreground -mt-2">
            {filtered.length} de {ratings.length} transportista{ratings.length !== 1 ? "s" : ""}
          </p>

          {/* Cards */}
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 rounded-lg border border-dashed">
              Ningún transportista coincide con los filtros.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((carrier, i) => (
                <CarrierCard
                  key={carrier.legalName}
                  carrier={carrier}
                  rank={ratings.indexOf(carrier) + 1}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
