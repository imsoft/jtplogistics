"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { DataTableSkeleton } from "@/components/ui/skeletons";
import Link from "next/link";
import { pdf } from "@react-pdf/renderer";
import { Plus, Trash2, FileText, Loader2, Settings, Send } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import { getCarrierQuotesColumns } from "./carrier-quotes-columns";
import { QuotePdf } from "./quote-pdf";
import { CityCombobox } from "@/components/dashboard/routes/city-combobox";
import { parseCityValue } from "@/lib/data/mexico-cities";
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
  email: string | null;
  validUntil: string;
  rows: QuoteRow[];
  /** Quien creó la cotización originalmente (para la zona de firmas). */
  creatorName?: string;
  creatorPosition?: string;
}

interface CarrierQuotesTableProps {
  apiEndpoint?: string;
  showTermsLink?: boolean;
  /** Si se pasa, el constructor arranca precargado y guarda con PATCH en vez de crear. */
  editQuote?: EditQuote;
  /** Base para guardar la edición (PATCH `${updateEndpoint}/${id}`). Admin por defecto. */
  updateEndpoint?: string;
  /** Listado de cotizaciones del rol: a dónde se vuelve al guardar o cancelar. */
  listPath?: string;
  /** Pantalla de textos legales. Sin ella no se muestra el enlace. */
  termsPath?: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────

async function fetchQuotes(endpoint: string, routeId?: string): Promise<CarrierQuotesResponse> {
  const url = routeId ? `${endpoint}?routeId=${routeId}` : endpoint;
  const res = await fetch(url);
  if (!res.ok) return { routes: [], carriers: [] };
  return res.json();
}

/**
 * Texto del error para la UI. Se muestra la causa real (y no un mensaje
 * genérico) porque sin ella es imposible diagnosticar por qué falló la descarga
 * en la máquina de quien cotiza.
 */
function errorText(e: unknown): string {
  if (e instanceof Error) return e.message;
  return typeof e === "string" ? e : "error desconocido";
}

/** Margen de JTP sobre el costo: el precio sugerido es el costo más un 30%. */
const MARKUP = 1.3;

function computeStats(quotes: CarrierQuote[]) {
  const targets = quotes.map((q) => q.carrierTarget).filter((t): t is number => t != null && !Number.isNaN(t));
  if (targets.length === 0) return { avg: null, venta: null };
  const avg = targets.reduce((a, b) => a + b, 0) / targets.length;
  return { avg, venta: avg * MARKUP };
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
  listPath = "/admin/dashboard/quotes",
  termsPath = "/admin/dashboard/quotes/terms",
}: CarrierQuotesTableProps) {
  const router = useRouter();
  const isEditing = !!editQuote;

  // ── Explorer state ──
  const [routes, setRoutes] = useState<ActiveRoute[]>([]);
  const [carriers, setCarriers] = useState<CarrierQuote[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadingCarriers, setIsLoadingCarriers] = useState(false);
  const [unitTypes, setUnitTypes] = useState<UnitTypeOption[]>([]);
  const [currentUser, setCurrentUser] = useState<{ name: string; position: string | null } | null>(null);
  const [selectedUnitType, setSelectedUnitType] = useState("");
  // Valores del catálogo de ciudades, con formato "Estado|Ciudad".
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterPrice, setFilterPrice] = useState("all");
  const [finalPrice, setFinalPrice] = useState<number | null>(null);
  // Costo del flete cuando no hay de dónde sacarlo: trayecto sin ruta registrada.
  const [manualCost, setManualCost] = useState<number | null>(null);

  // ── Quote builder state (precargado en modo edición) ──
  const [quoteNumber, setQuoteNumber] = useState(editQuote?.quoteNumber ?? "");
  const [company, setCompany] = useState(editQuote?.company ?? "");
  const [contact, setContact] = useState(editQuote?.contact ?? "");
  const [phone, setPhone] = useState(editQuote?.phone ?? "");
  const [email, setEmail] = useState(editQuote?.email ?? "");
  const [validUntil, setValidUntil] = useState(editQuote?.validUntil ?? defaultValidUntil());
  const [quoteRows, setQuoteRows] = useState<QuoteRow[]>(editQuote?.rows ?? []);
  const [isGenerating, setIsGenerating] = useState(false);
  // ── Envío por correo ──
  const [sendOpen, setSendOpen] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sendMessage, setSendMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{ to: string; fellBack: boolean; replyTo: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const builderRef = useRef<HTMLDivElement>(null);

  // ── Load data ──
  const loadRoutes = useCallback(async () => {
    const [data, utRes, numRes, profileRes] = await Promise.all([
      fetchQuotes(apiEndpoint),
      fetch("/api/unit-types").then((r) => r.ok ? r.json() : []),
      // En modo edición se conserva el número existente.
      isEditing ? Promise.resolve(null) : fetch("/api/generated-quotes/next-number").then((r) => r.ok ? r.json() : null),
      // Datos del usuario actual: al crear una cotización, él es quien firma.
      fetch("/api/profile").then((r) => (r.ok ? r.json() : null)),
    ]);
    setRoutes(data.routes);
    setUnitTypes(utRes);
    if (profileRes) {
      setCurrentUser({
        name: profileRes.name ?? "",
        position: profileRes.position ?? null,
      });
    }
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

  // Origen y destino se eligen del catálogo completo de ciudades ("Estado|Ciudad"),
  // no solo de las rutas registradas: se puede cotizar cualquier trayecto.
  const originCity = useMemo(() => parseCityValue(selectedOrigin).city, [selectedOrigin]);
  const destinationCity = useMemo(
    () => parseCityValue(selectedDestination).city,
    [selectedDestination]
  );
  const destinationState = useMemo(
    () => parseCityValue(selectedDestination).state || null,
    [selectedDestination]
  );
  const hasCityPair = Boolean(originCity && destinationCity);

  const sameCity = (a: string, b: string) =>
    a.trim().toLowerCase() === b.trim().toLowerCase();

  // Si el trayecto coincide con una ruta registrada se muestran sus
  // transportistas y targets; si no, se cotiza capturando el precio a mano.
  const selectedRoute = useMemo(
    () =>
      hasCityPair
        ? filteredByUnit.find(
            (r) => sameCity(r.origin, originCity) && sameCity(r.destination, destinationCity)
          ) ?? null
        : null,
    [filteredByUnit, originCity, destinationCity, hasCityPair]
  );
  const selectedRouteId = selectedRoute?.id ?? null;
  const routeTarget = selectedRoute?.target ?? null;

  // ── Load carriers when route changes ──
  useEffect(() => {
    setFinalPrice(null);
    setManualCost(null);
    if (!selectedRouteId) { setCarriers([]); return; }
    setIsLoadingCarriers(true);
    fetchQuotes(apiEndpoint, selectedRouteId).then((data) => {
      setCarriers(data.carriers);
      setIsLoadingCarriers(false);
    });
  }, [selectedRouteId, apiEndpoint]);

  // ── Handlers ──
  function handleUnitTypeChange(v: string) {
    setSelectedUnitType(v); setCarriers([]); setSearch(""); setFilterPrice("all");
  }
  function handleOriginChange(v: string | null) {
    setSelectedOrigin(v); setCarriers([]); setSearch(""); setFilterPrice("all");
  }
  function handleClear() {
    setSelectedUnitType(""); setSelectedOrigin(null); setSelectedDestination(null); setCarriers([]); setSearch(""); setFilterPrice("all");
  }

  // Quien firma la cotización: al editar es su creador original; al crear una
  // nueva, el usuario en sesión. Nunca se usa el nombre de otra persona.
  const signer = useMemo(
    () =>
      isEditing
        ? { name: editQuote?.creatorName, position: editQuote?.creatorPosition }
        : { name: currentUser?.name, position: currentUser?.position ?? undefined },
    [isEditing, editQuote, currentUser]
  );

  // Etiqueta legible del tipo de unidad: la de la ruta si existe, y si no la
  // que se haya elegido en el filtro (trayecto sin ruta registrada).
  const selectedUnitLabel = useMemo(() => {
    const value = selectedRoute?.unitType ?? selectedUnitType;
    if (!value) return null;
    return unitTypes.find((u) => u.value === value)?.label ?? value;
  }, [selectedRoute, selectedUnitType, unitTypes]);

  const columns = useMemo(
    () => getCarrierQuotesColumns(routeTarget, selectedUnitLabel),
    [routeTarget, selectedUnitLabel]
  );
  const stats = useMemo(() => computeStats(carriers), [carriers]);

  /**
   * De dónde sale el precio sugerido, por orden de fiabilidad:
   *   1. el promedio de lo que cotizaron los transportistas;
   *   2. el target de la ruta registrada, si nadie la ha cotizado todavía;
   *   3. el costo que capture quien cotiza, para trayectos que aún no son ruta.
   * Sin ninguno de los tres no hay margen que calcular.
   */
  const priceBase = stats.avg ?? routeTarget ?? manualCost;
  const baseSource: "carriers" | "route" | "manual" | null =
    stats.avg != null ? "carriers" : routeTarget != null ? "route" : manualCost != null ? "manual" : null;
  const suggestedPrice = priceBase != null ? priceBase * MARKUP : null;

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

  // Se cotiza el trayecto elegido: si coincide con una ruta registrada se usan
  // sus datos; si no, los del catálogo de ciudades.
  const quoteOrigin = selectedRoute?.origin ?? originCity;
  const quoteDestination = selectedRoute?.destination ?? destinationCity;
  const quoteDestinationState = selectedRoute?.destinationState ?? destinationState;

  const selectedRouteKey = hasCityPair
    ? `${quoteOrigin}||${quoteDestination}||${selectedUnitLabel ?? ""}`
    : null;

  // Sin ruta registrada no hay targets de referencia, así que el precio debe
  // capturarse a mano antes de poder agregar el trayecto.
  const canAddToQuote =
    hasCityPair &&
    selectedRouteKey != null &&
    !usedRouteKeys.has(selectedRouteKey) &&
    (finalPrice != null || suggestedPrice != null);

  function addCurrentRouteToQuote() {
    if (!canAddToQuote || !selectedRouteKey) return;
    const cost = finalPrice ?? suggestedPrice ?? 0;
    setQuoteRows((prev) => [...prev, {
      origin: quoteOrigin,
      destination: quoteDestination,
      destinationState: quoteDestinationState,
      cost,
      unitLabel: selectedUnitLabel ?? "",
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
        body: JSON.stringify({ company, contact, phone: phone || null, email: email || null, validUntil, rows: quoteRows }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Error al guardar");
      }
      router.push(listPath);
      router.refresh();
    } catch (e) {
      setQuoteError(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setIsSaving(false);
    }
  }

  /** Arma el PDF de la cotización tal como está en pantalla. */
  async function buildQuoteBlob(): Promise<Blob> {
    // Los textos legales son opcionales: si no se pueden traer, la cotización
    // se genera igual en vez de dejar al usuario sin PDF.
    let termsJson: QuoteTermsJson = { bulletsJson: "", contractJson: "", privacyJson: "", limitsJson: "" };
    try {
      const termsRes = await fetch("/api/quote-config");
      if (termsRes.ok) termsJson = await termsRes.json();
    } catch (e) {
      console.error("No se pudieron cargar los textos legales:", e);
    }

    return pdf(
      <QuotePdf
        data={{ quoteNumber, company, contact, phone, email, validUntil, rows: quoteRows }}
        logoUrl={window.location.origin + "/images/logo/jtp-logistics.png"}
        termsJson={termsJson}
        creatorName={signer.name}
        creatorPosition={signer.position}
      />
    ).toBlob();
  }

  /** Abre el diálogo con el correo del contacto ya puesto. */
  function openSendDialog() {
    setQuoteError(null);
    if (!company.trim()) { setQuoteError("Ingresa el nombre de la compañía."); return; }
    if (!contact.trim()) { setQuoteError("Ingresa el nombre del contacto."); return; }
    if (quoteRows.length === 0) { setQuoteError("Agrega al menos una ruta."); return; }
    setSendError(null);
    setSendResult(null);
    setSendTo(email);
    setSendOpen(true);
  }

  async function handleSend() {
    setSendError(null);
    if (!sendTo.trim()) {
      setSendError("Escribe el correo de quien va a recibir la cotización.");
      return;
    }
    setIsSending(true);
    try {
      const blob = await buildQuoteBlob();
      // Solo la parte de datos: el prefijo "data:application/pdf;base64," no
      // forma parte del contenido del archivo.
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });

      const res = await fetch("/api/generated-quotes/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteNumber, company, contact, validUntil,
          to: sendTo.trim(),
          message: sendMessage.trim() || null,
          pdfBase64: base64,
        }),
      });
      const data = await res.json() as { error?: string; to?: string; fellBack?: boolean; replyTo?: string };
      if (!res.ok) {
        setSendError(data.error ?? "No se pudo enviar la cotización.");
        return;
      }
      setSendResult({ to: data.to ?? sendTo, fellBack: !!data.fellBack, replyTo: data.replyTo ?? "" });
      setSendMessage("");
    } catch (e) {
      console.error("Error al enviar la cotización:", e);
      setSendError(`No se pudo enviar la cotización: ${errorText(e)}`);
    } finally {
      setIsSending(false);
    }
  }

  async function handleDownloadPdf() {
    setQuoteError(null);
    if (!company.trim()) { setQuoteError("Ingresa el nombre de la compañía."); return; }
    if (!contact.trim()) { setQuoteError("Ingresa el nombre del contacto."); return; }
    if (quoteRows.length === 0) { setQuoteError("Agrega al menos una ruta."); return; }
    setIsGenerating(true);
    try {
      let blob: Blob;
      try {
        blob = await buildQuoteBlob();
      } catch (e) {
        console.error("Error al generar el PDF:", e);
        setQuoteError(`No se pudo generar el PDF: ${errorText(e)}`);
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Cotizacion-${quoteNumber}.pdf`;
      // El enlace va al DOM y la URL se libera después: revocarla en el mismo
      // tick cancela la descarga en algunos navegadores.
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);

      // ── Guardar en el historial ──
      // El PDF ya está en manos del usuario: si el guardado falla hay que
      // decirlo con claridad, no reportarlo como un error de generación.
      try {
        const saveRes = await fetch("/api/generated-quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quoteNumber, company, contact, phone, email: email || null, validUntil, rows: quoteRows }),
        });
        const saved = await saveRes.json().catch(() => ({})) as { error?: string; quoteNumber?: string };
        if (!saveRes.ok) {
          throw new Error(saved.error ?? `Error ${saveRes.status}`);
        }
        // El servidor puede haber asignado otro número si el previsto ya estaba
        // tomado; se avisa para que no se mande un PDF con un número distinto
        // del que quedó guardado.
        if (saved.quoteNumber && saved.quoteNumber !== quoteNumber) {
          setQuoteError(
            `El número ${quoteNumber} ya estaba ocupado: la cotización se guardó como ${saved.quoteNumber}. Vuelve a descargar el PDF para que coincida.`
          );
          setQuoteNumber(saved.quoteNumber);
          return;
        }
      } catch (e) {
        console.error("Error al guardar la cotización:", e);
        setQuoteError(`El PDF se descargó, pero la cotización no se guardó en el historial: ${errorText(e)}`);
        return;
      }

      const nextRes = await fetch("/api/generated-quotes/next-number").catch(() => null);
      if (nextRes?.ok) {
        const { quoteNumber: next } = await nextRes.json() as { quoteNumber: string };
        setQuoteNumber(next);
      }
    } catch (e) {
      console.error(e);
      setQuoteError(`Error al generar la cotización: ${errorText(e)}`);
    } finally {
      setIsGenerating(false);
    }
  }

  if (!isLoaded) return <DataTableSkeleton />;

  return (
    <div className="space-y-8">
      {/* ─── SECCIÓN 1: FILTROS ─────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
        <CityCombobox
          id="qb-origin"
          label="Origen"
          value={selectedOrigin}
          onValueChange={handleOriginChange}
        />
        <CityCombobox
          id="qb-destination"
          label="Destino"
          value={selectedDestination}
          onValueChange={setSelectedDestination}
        />
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

      {/* ─── SECCIÓN 2: TRANSPORTISTAS Y PRECIO ─────────────────────────────── */}
      {!hasCityPair ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          Elige origen y destino para continuar.
        </p>
      ) : (
        <div className="space-y-4">
          {selectedRouteId ? (
            isLoadingCarriers ? (
              <p className="text-muted-foreground">Cargando transportistas…</p>
            ) : carriers.length === 0 ? (
              <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
                Ningún transportista ha seleccionado esta ruta todavía.
              </p>
            ) : (
              <DataTable<CarrierQuote, unknown> columns={columns} data={filteredCarriers} getRowId={(row) => row.id} filterColumn="" />
            )
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Este trayecto no corresponde a una ruta registrada, así que no hay
              targets de transportistas como referencia. Captura el precio para
              agregarlo a la cotización.
            </p>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {baseSource === "carriers" ? "Resumen de targets" : "Precio"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {/* Costo: el promedio de los transportistas, el target de la ruta
                    o, si no hay nada, el que se capture aquí. */}
                {baseSource === "carriers" ? (
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-muted-foreground text-xs font-medium">Promedio</p>
                    <p className="text-lg font-semibold">${formatMxn(stats.avg!)}</p>
                    <p className="text-muted-foreground mt-0.5 text-[10px]">
                      {carriers.length === 1 ? "1 transportista" : `${carriers.length} transportistas`}
                    </p>
                  </div>
                ) : baseSource === "route" ? (
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-muted-foreground text-xs font-medium">Target de la ruta</p>
                    <p className="text-lg font-semibold">${formatMxn(routeTarget!)}</p>
                    <p className="text-muted-foreground mt-0.5 text-[10px]">
                      Ningún transportista la ha cotizado
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg bg-muted/50 p-4 space-y-1">
                    <p className="text-muted-foreground text-xs font-medium">Costo</p>
                    <Input
                      type="number" min="0" step="100"
                      value={manualCost ?? ""}
                      onChange={(e) => setManualCost(e.target.value ? parseFloat(e.target.value) : null)}
                      className="h-8 text-sm font-semibold"
                    />
                    <p className="text-muted-foreground text-[10px]">
                      Lo que cuesta el flete, para calcular tu precio
                    </p>
                  </div>
                )}

                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-muted-foreground text-xs font-medium">Precio sugerido</p>
                  <p className="text-lg font-semibold">
                    {suggestedPrice != null ? `$${formatMxn(suggestedPrice)}` : "—"}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-[10px]">
                    {suggestedPrice != null
                      ? `Costo + ${Math.round((MARKUP - 1) * 100)}%`
                      : "Captura el costo"}
                  </p>
                </div>

                <div className="rounded-lg bg-muted/50 p-4 space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">Precio final</p>
                  <Input
                    type="number" min="0" step="100"
                    value={finalPrice ?? ""}
                    onChange={(e) => setFinalPrice(e.target.value ? parseFloat(e.target.value) : null)}
                    className="h-8 text-sm font-semibold"
                  />
                  {suggestedPrice != null && finalPrice == null && (
                    <p className="text-muted-foreground text-[10px]">
                      Si lo dejas vacío se usa el sugerido
                    </p>
                  )}
                  {/* Utilidad real cuando se pisa el sugerido con otro precio. */}
                  {finalPrice != null && priceBase != null && (
                    <p className="text-[10px] font-medium text-muted-foreground">
                      Utilidad: ${formatMxn(finalPrice - priceBase)} (
                      {Math.round(((finalPrice - priceBase) / priceBase) * 100)}%)
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end gap-3">
                {selectedRouteKey && usedRouteKeys.has(selectedRouteKey) ? (
                  <span className="text-xs text-muted-foreground">
                    Este trayecto ya está en la cotización.
                  </span>
                ) : !canAddToQuote ? (
                  <span className="text-xs text-muted-foreground">
                    Captura el costo o el precio final para agregarlo.
                  </span>
                ) : null}
                <Button
                  variant="default"
                  size="sm"
                  onClick={addCurrentRouteToQuote}
                  disabled={!canAddToQuote}
                >
                  <Plus className="size-3.5" />
                  Agregar ruta a cotización
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── SECCIÓN 3: COTIZACIÓN ──────────────────────────────────────────── */}
      <div ref={builderRef} className="space-y-6 pt-2">
        {showTermsLink && (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" asChild className="shrink-0 text-muted-foreground">
              <Link href={termsPath}>
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
            <DatePicker
              id="qb-vigencia"
              value={validUntil}
              onChange={(value) => setValidUntil(value)}
            />
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
          <div className="space-y-2">
            <Label htmlFor="qb-email">Correo</Label>
            {/* type="email" ya fuerza minúsculas por la regla de globals.css. */}
            <Input
              id="qb-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-email"
            />
            <p className="text-xs text-muted-foreground">
              Aparece en el PDF debajo del teléfono. Puede quedarse vacío.
            </p>
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
              <Link href={listPath}>Cancelar</Link>
            </Button>
            <Button type="button" variant="outline" onClick={openSendDialog} size="lg">
              <Send className="size-4" />
              Enviar por correo
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving} size="lg">
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              {isSaving ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col justify-end gap-3 pb-4 sm:flex-row">
            <Button type="button" variant="outline" onClick={openSendDialog} size="lg">
              <Send className="size-4" />
              Enviar por correo
            </Button>
            <Button onClick={handleDownloadPdf} disabled={isGenerating} size="lg">
              {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
              {isGenerating ? "Generando PDF…" : "Descargar cotización PDF"}
            </Button>
          </div>
        )}
      </div>

      {/* ── Enviar la cotización al cliente ── */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar cotización {quoteNumber}</DialogTitle>
            <DialogDescription>
              Sale con el PDF adjunto desde tu correo, así el cliente te responde
              directamente a ti.
            </DialogDescription>
          </DialogHeader>

          {sendResult ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-green-600">
                Cotización enviada a {sendResult.to}.
              </p>
              {sendResult.fellBack && (
                <p className="text-xs text-muted-foreground">
                  Salió desde el correo de la plataforma porque el dominio jtp.com.mx
                  todavía no está dado de alta en Resend. Las respuestas te llegan a{" "}
                  <span className="text-email">{sendResult.replyTo}</span>.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="send-to">Para</Label>
                <Input
                  id="send-to"
                  type="email"
                  value={sendTo}
                  onChange={(e) => setSendTo(e.target.value)}
                  className="text-email"
                />
                <p className="text-xs text-muted-foreground">
                  Se precarga con el correo del contacto de la cotización.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="send-message">Mensaje</Label>
                <Textarea
                  id="send-message"
                  value={sendMessage}
                  onChange={(e) => setSendMessage(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Opcional. Se agrega al cuerpo del correo, antes de tu firma.
                </p>
              </div>

              {sendError && <p className="text-sm font-medium text-destructive">{sendError}</p>}
            </>
          )}

          <DialogFooter>
            {sendResult ? (
              <Button onClick={() => setSendOpen(false)}>Cerrar</Button>
            ) : (
              <Button onClick={handleSend} disabled={isSending}>
                {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {isSending ? "Enviando…" : "Enviar"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
