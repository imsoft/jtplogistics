"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { DataTableSkeleton } from "@/components/ui/skeletons";
import Link from "next/link";
import { pdf } from "@react-pdf/renderer";
import { Plus, Trash2, FileText, Loader2, Settings } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import { getCarrierQuotesColumns } from "./carrier-quotes-columns";
import { QuotePdf } from "./quote-pdf";
import { ROUTE_STATUS_LABELS } from "@/lib/constants/route-status";
import type { ActiveRoute, CarrierQuote, CarrierQuotesResponse, QuoteRow } from "@/types/carrier-quote.types";
import type { QuoteTermsJson } from "./quote-pdf";
import { formatMxn } from "@/lib/utils";
import { fuzzyMatch } from "@/lib/search";

// ── types ────────────────────────────────────────────────────────────────────

interface UnitTypeOption { value: string; label: string; }

/** Cotización existente para precargar el constructor en modo edición. */
export interface EditQuote {
  id: string;
  quoteNumber: string;
  company: string;
  contact: string;
  phone: string;
  validUntil: string;
  rows: QuoteRow[];
  creatorName?: string;
}

interface CarrierQuotesTableProps {
  apiEndpoint?: string;
  showTermsLink?: boolean;
  /** Si se pasa, el constructor arranca precargado y guarda con PATCH en vez de crear. */
  editQuote?: EditQuote;
  /** Base para guardar la edición (PATCH `${updateEndpoint}/${id}`). Admin por defecto. */
  updateEndpoint?: string;
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

// ── component ─────────────────────────────────────────────────────────────────

export function CarrierQuotesTable({
  apiEndpoint = "/api/admin/carrier-quotes",
  showTermsLink = false,
  editQuote,
  updateEndpoint = "/api/admin/generated-quotes",
}: CarrierQuotesTableProps) {
  const router = useRouter();
  const isEditing = !!editQuote;

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

  // ── Quote builder state (precargado en modo edición) ──
  const [quoteNumber, setQuoteNumber] = useState(editQuote?.quoteNumber ?? "");
  const [company, setCompany] = useState(editQuote?.company ?? "");
  const [contact, setContact] = useState(editQuote?.contact ?? "");
  const [phone, setPhone] = useState(editQuote?.phone ?? "");
  const [validUntil, setValidUntil] = useState(editQuote?.validUntil ?? defaultValidUntil());
  const [quoteRows, setQuoteRows] = useState<QuoteRow[]>(editQuote?.rows ?? []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const builderRef = useRef<HTMLDivElement>(null);

  // ── Load data ──
  const loadRoutes = useCallback(async () => {
    const [data, utRes, numRes] = await Promise.all([
      fetchQuotes(apiEndpoint),
      fetch("/api/unit-types").then((r) => r.ok ? r.json() : []),
      // En modo edición se conserva el número existente.
      isEditing ? Promise.resolve(null) : fetch("/api/generated-quotes/next-number").then((r) => r.ok ? r.json() : null),
    ]);
    setRoutes(data.routes);
    setUnitTypes(utRes);
    if (!isEditing && numRes?.quoteNumber) setQuoteNumber(numRes.quoteNumber);
    setIsLoaded(true);
  }, [apiEndpoint, isEditing]);

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

  // Etiqueta legible del tipo de unidad de la ruta seleccionada.
  const selectedUnitLabel = useMemo(() => {
    if (!selectedRoute) return null;
    return (
      unitTypes.find((u) => u.value === selectedRoute.unitType)?.label ??
      selectedRoute.unitType
    );
  }, [selectedRoute, unitTypes]);

  const columns = useMemo(
    () => getCarrierQuotesColumns(routeTarget, selectedUnitLabel),
    [routeTarget, selectedUnitLabel]
  );
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
  // La clave incluye el tipo de unidad: una misma ruta se puede cotizar en
  // varios tipos de unidad (p. ej. caja seca y refrigerado por separado).
  const usedRouteKeys = useMemo(
    () => new Set(quoteRows.map((r) => `${r.origin}||${r.destination}||${r.unitLabel}`)),
    [quoteRows]
  );

  const selectedRouteKey = selectedRoute
    ? `${selectedRoute.origin}||${selectedRoute.destination}||${selectedUnitLabel ?? ""}`
    : null;

function addCurrentRouteToQuote() {
    if (!selectedRoute || !selectedRouteKey) return;
    if (usedRouteKeys.has(selectedRouteKey)) return;
    const label = selectedUnitLabel ?? selectedRoute.unitType;
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

  async function handleSaveEdit() {
    if (!editQuote) return;
    setQuoteError(null);
    if (!company.trim()) { setQuoteError("Ingresa el nombre de la compañía."); return; }
    if (!contact.trim()) { setQuoteError("Ingresa el nombre del contacto."); return; }
    if (quoteRows.length === 0) { setQuoteError("Agrega al menos una ruta."); return; }
    setIsSaving(true);
    try {
      const res = await fetch(`${updateEndpoint}/${editQuote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, contact, phone: phone || null, validUntil, rows: quoteRows }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Error al guardar");
      }
      router.push("/admin/dashboard/quotes");
      router.refresh();
    } catch (e) {
      setQuoteError(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDownloadPdf() {
    setQuoteError(null);
    if (!company.trim()) { setQuoteError("Ingresa el nombre de la compañía."); return; }
    if (!contact.trim()) { setQuoteError("Ingresa el nombre del contacto."); return; }
    if (quoteRows.length === 0) { setQuoteError("Agrega al menos una ruta."); return; }
    setIsGenerating(true);
    try {
      const termsRes = await fetch("/api/quote-config");
      const termsJson: QuoteTermsJson = termsRes.ok ? await termsRes.json() : { bulletsJson: "", contractJson: "", privacyJson: "", limitsJson: "" };
      const logoUrl = window.location.origin + "/images/logo/jtp-logistics.png";
      const blob = await pdf(
        <QuotePdf data={{ quoteNumber, company, contact, phone, validUntil, rows: quoteRows }} logoUrl={logoUrl} termsJson={termsJson} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `Cotizacion-${quoteNumber}.pdf`; a.click();
      URL.revokeObjectURL(url);

      await fetch("/api/generated-quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteNumber, company, contact, phone, validUntil, rows: quoteRows }),
      });

      const nextRes = await fetch("/api/generated-quotes/next-number");
      if (nextRes.ok) {
        const { quoteNumber: next } = await nextRes.json() as { quoteNumber: string };
        setQuoteNumber(next);
      }
    } catch (e) {
      console.error(e);
      setQuoteError("Error al generar el PDF.");
    } finally {
      setIsGenerating(false);
    }
  }

  if (!isLoaded) return <DataTableSkeleton />;

  return (
    <div className="space-y-8">
      {/* ─── SECCIÓN 1: FILTROS ─────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
        <div className="space-y-2">
          <Label className="text-xs font-medium">Origen</Label>
          <AppSelect value={selectedOrigin} onValueChange={handleOriginChange} options={origins.map((o) => ({value: o, label: o}))} className="w-full" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">Destino</Label>
          <AppSelect value={selectedDestination} onValueChange={setSelectedDestination} options={destinations.map((d) => ({value: d, label: d}))} disabled={!selectedOrigin} className="w-full" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">Tipo de unidad</Label>
          <AppSelect
            value={selectedUnitType}
            onValueChange={handleUnitTypeChange}
            options={availableUnitTypes}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">Buscar</Label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} disabled={!selectedRouteId} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">Target vs. ruta</Label>
          <AppSelect value={filterPrice} onValueChange={setFilterPrice} options={[{value: "all", label: "Todos"}, {value: "below", label: "Por debajo del target"}, {value: "above", label: "Por encima del target"}]} disabled={!selectedRouteId || routeTarget == null} className="w-full" />
        </div>
        <div className="space-y-2">
          <Label className="invisible text-xs font-medium">_</Label>
          <Button type="button" variant="outline" onClick={handleClear} className="w-full">Limpiar</Button>
        </div>
      </div>

      {/* Aviso: la ruta se puede cotizar aunque no esté activa. */}
      {selectedRoute?.status && selectedRoute.status !== "active" && (
        <p className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
          Esta ruta está marcada como{" "}
          <span className="font-medium">
            {ROUTE_STATUS_LABELS[selectedRoute.status]}
          </span>
          . Puedes cotizarla igualmente.
        </p>
      )}

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
                {selectedRouteKey && !usedRouteKeys.has(selectedRouteKey) && (
                  <div className="mt-3 flex justify-end">
                    <Button variant="default" size="sm" onClick={addCurrentRouteToQuote}>
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
            <Input id="qb-num" value={quoteNumber} disabled className="bg-muted" />
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
          <div className="space-y-2">
            <Label htmlFor="qb-phone">Teléfono</Label>
            <Input id="qb-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
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
                    <th className="text-left px-3 py-2 font-medium text-xs">Unidad</th>
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
                      <td className="px-3 py-2 text-xs font-medium">{row.unitLabel}</td>
                      <td className="px-2 py-2">
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => removeRow(i)} aria-label="Eliminar fila">
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

        {isEditing ? (
          <div className="flex justify-end gap-3 pb-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/dashboard/quotes">Cancelar</Link>
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving} size="lg">
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              {isSaving ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        ) : (
          <div className="flex justify-end pb-4">
            <Button onClick={handleDownloadPdf} disabled={isGenerating} size="lg">
              {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
              {isGenerating ? "Generando PDF…" : "Descargar cotización PDF"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
