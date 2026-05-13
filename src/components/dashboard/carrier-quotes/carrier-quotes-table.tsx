"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { pdf } from "@react-pdf/renderer";
import { Plus, Trash2, FileText, Loader2, Settings } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getCarrierQuotesColumns } from "./carrier-quotes-columns";
import { QuotePdf } from "./quote-pdf";
import type { ActiveRoute, CarrierQuote, CarrierQuotesResponse, QuoteRow } from "@/types/carrier-quote.types";
import type { QuoteTermsJson } from "./quote-pdf";
import { formatMxn } from "@/lib/utils";
import { fuzzyMatch } from "@/lib/search";

// ── types ────────────────────────────────────────────────────────────────────

interface UnitTypeOption { value: string; label: string; }

interface CarrierQuotesTableProps {
  apiEndpoint?: string;
  showTermsLink?: boolean;
}

// ── helpers ──────────────────────────────────────────────────────────────────

async function fetchQuotes(endpoint: string, routeId?: string): Promise<CarrierQuotesResponse> {
  const url = routeId ? `${endpoint}?routeId=${routeId}` : endpoint;
  const res = await fetch(url);
  if (!res.ok) return { routes: [], carriers: [] };
  return res.json();
}

function computeStats(quotes: CarrierQuote[]) {
  const targets = quotes.map((q) => q.carrierTarget).filter((t): t is number => t != null && !Number.isNaN(t));
  if (targets.length === 0) return { avg: null, venta: null };
  const avg = targets.reduce((a, b) => a + b, 0) / targets.length;
  return { avg, venta: avg * 1.3 };
}

function defaultValidUntil() {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  d.setDate(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate());
  return d.toISOString().split("T")[0];
}

function generateQuoteNumber() {
  const n = new Date();
  const pad = (x: number) => String(x).padStart(2, "0");
  return `JTP-${n.getFullYear()}${pad(n.getMonth() + 1)}${pad(n.getDate())}-001`;
}

// ── component ─────────────────────────────────────────────────────────────────

export function CarrierQuotesTable({
  apiEndpoint = "/api/admin/carrier-quotes",
  showTermsLink = false,
}: CarrierQuotesTableProps) {
  // ── Explorer state ──
  const [routes, setRoutes] = useState<ActiveRoute[]>([]);
  const [carriers, setCarriers] = useState<CarrierQuote[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadingCarriers, setIsLoadingCarriers] = useState(false);
  const [unitTypes, setUnitTypes] = useState<UnitTypeOption[]>([]);
  const [selectedUnitType, setSelectedUnitType] = useState("");
  const [selectedOrigin, setSelectedOrigin] = useState("");
  const [selectedDestination, setSelectedDestination] = useState("");
  const [search, setSearch] = useState("");
  const [filterPrice, setFilterPrice] = useState("all");
  const [finalPrice, setFinalPrice] = useState<number | null>(null);

  // ── Quote builder state ──
  const [quoteNumber, setQuoteNumber] = useState(generateQuoteNumber);
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [validUntil, setValidUntil] = useState(defaultValidUntil);
  const [quoteRows, setQuoteRows] = useState<QuoteRow[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const builderRef = useRef<HTMLDivElement>(null);

  // ── Load data ──
  const loadRoutes = useCallback(async () => {
    const [data, utRes] = await Promise.all([
      fetchQuotes(apiEndpoint),
      fetch("/api/unit-types").then((r) => r.ok ? r.json() : []),
    ]);
    setRoutes(data.routes);
    setUnitTypes(utRes);
    setIsLoaded(true);
  }, [apiEndpoint]);

  useEffect(() => { loadRoutes(); }, [loadRoutes]);

  // ── Derived: unit types present in routes ──
  const availableUnitTypes = useMemo(() => {
    const vals = Array.from(new Set(routes.map((r) => r.unitType)));
    return vals.map((v) => ({ value: v, label: unitTypes.find((u) => u.value === v)?.label ?? v }));
  }, [routes, unitTypes]);

  // ── Derived: filtered routes by unit type ──
  const filteredByUnit = useMemo(
    () => selectedUnitType ? routes.filter((r) => r.unitType === selectedUnitType) : routes,
    [routes, selectedUnitType]
  );

  const origins = useMemo(
    () => Array.from(new Set(filteredByUnit.map((r) => r.origin))).sort(),
    [filteredByUnit]
  );
  const destinations = useMemo(
    () => filteredByUnit.filter((r) => r.origin === selectedOrigin).map((r) => r.destination).sort(),
    [filteredByUnit, selectedOrigin]
  );
  const selectedRoute = useMemo(
    () => filteredByUnit.find((r) => r.origin === selectedOrigin && r.destination === selectedDestination) ?? null,
    [filteredByUnit, selectedOrigin, selectedDestination]
  );
  const selectedRouteId = selectedRoute?.id ?? null;
  const routeTarget = selectedRoute?.target ?? null;

  // ── Load carriers when route changes ──
  useEffect(() => {
    setFinalPrice(null);
    if (!selectedRouteId) { setCarriers([]); return; }
    setIsLoadingCarriers(true);
    fetchQuotes(apiEndpoint, selectedRouteId).then((data) => {
      setCarriers(data.carriers);
      setIsLoadingCarriers(false);
    });
  }, [selectedRouteId, apiEndpoint]);

  // ── Handlers ──
  function handleUnitTypeChange(v: string) {
    setSelectedUnitType(v); setSelectedOrigin(""); setSelectedDestination(""); setCarriers([]); setSearch(""); setFilterPrice("all");
  }
  function handleOriginChange(v: string) {
    setSelectedOrigin(v); setSelectedDestination(""); setCarriers([]); setSearch(""); setFilterPrice("all");
  }
  function handleClear() {
    setSelectedUnitType(""); setSelectedOrigin(""); setSelectedDestination(""); setCarriers([]); setSearch(""); setFilterPrice("all");
  }

  const columns = useMemo(() => getCarrierQuotesColumns(routeTarget), [routeTarget]);
  const stats = useMemo(() => computeStats(carriers), [carriers]);

  const filteredCarriers = useMemo(() => {
    let r = carriers;
    const q = search.trim();
    if (q) r = r.filter((c) => fuzzyMatch(c.name, q) || fuzzyMatch(c.email, q) || fuzzyMatch(c.company ?? "", q));
    if (filterPrice !== "all" && routeTarget != null) {
      r = r.filter((c) => {
        if (c.carrierTarget == null) return false;
        return filterPrice === "below" ? c.carrierTarget < routeTarget : c.carrierTarget > routeTarget;
      });
    }
    return r;
  }, [carriers, search, filterPrice, routeTarget]);

  // ── Quote builder helpers ──
  const usedRouteKeys = useMemo(
    () => new Set(quoteRows.map((r) => `${r.origin}||${r.destination}`)),
    [quoteRows]
  );
function addCurrentRouteToQuote() {
    if (!selectedRoute) return;
    const key = `${selectedRoute.origin}||${selectedRoute.destination}`;
    if (usedRouteKeys.has(key)) return;
    const label = unitTypes.find((u) => u.value === selectedRoute.unitType)?.label ?? selectedRoute.unitType;
    const cost = finalPrice ?? stats.venta ?? 0;
    setQuoteRows((prev) => [...prev, {
      origin: selectedRoute.origin,
      destination: selectedRoute.destination,
      destinationState: selectedRoute.destinationState,
      cost,
      unitLabel: label,
    }]);
    setQuoteError(null);
    builderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function removeRow(i: number) { setQuoteRows((prev) => prev.filter((_, idx) => idx !== i)); }
  function updateCost(i: number, v: string) {
    const num = parseFloat(v.replace(/[^0-9.]/g, "")) || 0;
    setQuoteRows((prev) => prev.map((r, idx) => idx === i ? { ...r, cost: num } : r));
  }

  async function handleDownloadPdf() {
    setQuoteError(null);
    if (!company.trim()) { setQuoteError("Ingresa el nombre de la compañía."); return; }
    if (!contact.trim()) { setQuoteError("Ingresa el nombre del contacto."); return; }
    if (quoteRows.length === 0) { setQuoteError("Agrega al menos una ruta."); return; }
    setIsGenerating(true);
    try {
      const termsRes = await fetch("/api/admin/quote-config");
      const termsJson: QuoteTermsJson = termsRes.ok ? await termsRes.json() : { bulletsJson: "", contractJson: "", privacyJson: "", limitsJson: "" };
      const logoUrl = window.location.origin + "/images/logo/jtp-logistics.png";
      const blob = await pdf(
        <QuotePdf data={{ quoteNumber, company, contact, validUntil, rows: quoteRows }} logoUrl={logoUrl} termsJson={termsJson} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `cotizacion-${quoteNumber}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setQuoteError("Error al generar el PDF.");
    } finally {
      setIsGenerating(false);
    }
  }

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;

  return (
    <div className="space-y-8">
      {/* ─── SECCIÓN 1: FILTROS ─────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
        {availableUnitTypes.length > 1 && (
          <div className="space-y-2">
            <Label className="text-xs font-medium">Tipo de unidad</Label>
            <Select value={selectedUnitType} onValueChange={handleUnitTypeChange}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableUnitTypes.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Origen</Label>
          <Select value={selectedOrigin} onValueChange={handleOriginChange}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{origins.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">Destino</Label>
          <Select value={selectedDestination} onValueChange={setSelectedDestination} disabled={!selectedOrigin}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{destinations.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">Buscar</Label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} disabled={!selectedRouteId} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">Target vs. ruta</Label>
          <Select value={filterPrice} onValueChange={setFilterPrice} disabled={!selectedRouteId || routeTarget == null}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="below">Por debajo del target</SelectItem>
              <SelectItem value="above">Por encima del target</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="self-end">
          <Button type="button" variant="outline" onClick={handleClear}>Limpiar</Button>
        </div>
      </div>

      {/* ─── SECCIÓN 2: TRANSPORTISTAS ──────────────────────────────────────── */}
      {!selectedRouteId ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          Selecciona una ruta para ver los transportistas disponibles.
        </p>
      ) : isLoadingCarriers ? (
        <p className="text-muted-foreground">Cargando transportistas…</p>
      ) : carriers.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          Ningún transportista ha seleccionado esta ruta todavía.
        </p>
      ) : (
        <div className="space-y-4">
          <DataTable<CarrierQuote, unknown> columns={columns} data={filteredCarriers} getRowId={(row) => row.id} filterColumn="" />

          {stats.avg != null && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Resumen de targets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-muted-foreground text-xs font-medium">Promedio</p>
                    <p className="text-lg font-semibold">${formatMxn(stats.avg)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-muted-foreground text-xs font-medium">Precio sugerido</p>
                    <p className="text-lg font-semibold">${formatMxn(stats.venta)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 space-y-1">
                    <p className="text-muted-foreground text-xs font-medium">Precio final</p>
                    <Input
                      type="number" min="0" step="100"
                      value={finalPrice ?? ""}
                      onChange={(e) => setFinalPrice(e.target.value ? parseFloat(e.target.value) : null)}
                      className="h-8 text-sm font-semibold"
                    />
                  </div>
                </div>
                {selectedRoute && !usedRouteKeys.has(`${selectedRoute.origin}||${selectedRoute.destination}`) && (
                  <div className="mt-3 flex justify-end">
                    <Button variant="outline" size="sm" onClick={addCurrentRouteToQuote}>
                      <Plus className="size-3.5" />
                      Agregar ruta a cotización
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ─── SECCIÓN 3: COTIZACIÓN ──────────────────────────────────────────── */}
      <div ref={builderRef} className="space-y-6 pt-2">
        {showTermsLink && (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" asChild className="shrink-0 text-muted-foreground">
              <Link href="/admin/dashboard/quotes/terms">
                <Settings className="size-3.5" />
                Textos legales
              </Link>
            </Button>
          </div>
        )}

        {/* Datos del cliente */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="qb-num">No. Cotización</Label>
            <Input id="qb-num" value={quoteNumber} onChange={(e) => setQuoteNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qb-vigencia">Vigencia</Label>
            <Input id="qb-vigencia" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qb-company">Compañía</Label>
            <Input id="qb-company" value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qb-contact">Contacto</Label>
            <Input id="qb-contact" value={contact} onChange={(e) => setContact(e.target.value)} />
          </div>
        </div>

        {/* Rutas de la cotización */}
        <div className="space-y-3">
          <Label>Rutas incluidas</Label>

          {quoteRows.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-xs">Origen</th>
                    <th className="text-left px-3 py-2 font-medium text-xs">Destino</th>
                    <th className="text-left px-3 py-2 font-medium text-xs hidden sm:table-cell">Estado</th>
                    <th className="text-left px-3 py-2 font-medium text-xs">Costo ($)</th>
                    <th className="text-left px-3 py-2 font-medium text-xs hidden md:table-cell">Unidad</th>
                    <th className="px-2 py-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {quoteRows.map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2 text-sm">{row.origin}</td>
                      <td className="px-3 py-2 text-sm">{row.destination}</td>
                      <td className="px-3 py-2 text-sm text-muted-foreground hidden sm:table-cell">{row.destinationState ?? "—"}</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number" min="0" step="100"
                          value={row.cost || ""}
                          onChange={(e) => updateCost(i, e.target.value)}
                          className="w-28 h-8"
                        />
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground hidden md:table-cell">{row.unitLabel}</td>
                      <td className="px-2 py-2">
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => removeRow(i)}>
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {quoteRows.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay rutas agregadas.</p>
          )}
        </div>

        {quoteError && <p className="text-sm text-destructive">{quoteError}</p>}

        <div className="flex justify-end pb-4">
          <Button onClick={handleDownloadPdf} disabled={isGenerating} size="lg">
            {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
            {isGenerating ? "Generando PDF…" : "Descargar cotización PDF"}
          </Button>
        </div>
      </div>
    </div>
  );
}
