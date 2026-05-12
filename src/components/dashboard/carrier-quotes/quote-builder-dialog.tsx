"use client";

import { useState, useEffect, useMemo } from "react";
import { pdf } from "@react-pdf/renderer";
import { FileText, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuotePdf } from "./quote-pdf";
import type { ActiveRoute, QuoteRow } from "@/types/carrier-quote.types";

interface UnitTypeOption { value: string; label: string; }

function defaultValidUntil(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  d.setDate(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate());
  return d.toISOString().split("T")[0];
}

function generateQuoteNumber(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `JTP-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-001`;
}

interface QuoteBuilderDialogProps {
  routes: ActiveRoute[];
  preselectedRoute?: ActiveRoute | null;
  defaultCost?: number | null;
}

export function QuoteBuilderDialog({ routes, preselectedRoute, defaultCost }: QuoteBuilderDialogProps) {
  const [open, setOpen] = useState(false);
  const [unitTypes, setUnitTypes] = useState<UnitTypeOption[]>([]);
  const [quoteNumber, setQuoteNumber] = useState(generateQuoteNumber);
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [validUntil, setValidUntil] = useState(defaultValidUntil);
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/unit-types")
      .then((r) => r.json())
      .then((data: UnitTypeOption[]) => setUnitTypes(data))
      .catch(() => {});
  }, [open]);

  // Pre-populate with selected route when dialog opens
  useEffect(() => {
    if (!open) return;
    if (preselectedRoute) {
      const label = unitTypes.find((u) => u.value === preselectedRoute.unitType)?.label
        ?? preselectedRoute.unitType;
      setRows([{
        origin: preselectedRoute.origin,
        destination: preselectedRoute.destination,
        destinationState: preselectedRoute.destinationState,
        cost: defaultCost ?? 0,
        unitLabel: label,
      }]);
    }
  }, [open, preselectedRoute, unitTypes, defaultCost]);

  const usedRouteIds = useMemo(
    () => new Set(rows.map((r) => `${r.origin}||${r.destination}||${r.unitLabel}`)),
    [rows]
  );

  const availableRoutes = useMemo(
    () => routes.filter((r) => {
      const label = unitTypes.find((u) => u.value === r.unitType)?.label ?? r.unitType;
      return !usedRouteIds.has(`${r.origin}||${r.destination}||${label}`);
    }),
    [routes, unitTypes, usedRouteIds]
  );

  function addRoute() {
    if (!selectedRouteId) return;
    const route = routes.find((r) => r.id === selectedRouteId);
    if (!route) return;
    const label = unitTypes.find((u) => u.value === route.unitType)?.label ?? route.unitType;
    setRows((prev) => [
      ...prev,
      {
        origin: route.origin,
        destination: route.destination,
        destinationState: route.destinationState,
        cost: 0,
        unitLabel: label,
      },
    ]);
    setSelectedRouteId("");
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateCost(idx: number, value: string) {
    const num = parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, cost: num } : r)));
  }

  async function handleDownload() {
    setError(null);
    if (!company.trim()) { setError("Ingresa el nombre de la compañía."); return; }
    if (!contact.trim()) { setError("Ingresa el nombre del contacto."); return; }
    if (rows.length === 0) { setError("Agrega al menos una ruta."); return; }

    setIsGenerating(true);
    try {
      const logoUrl = window.location.origin + "/images/logo/jtp-logistics.png";
      const blob = await pdf(
        <QuotePdf
          data={{ quoteNumber, company, contact, validUntil, rows }}
          logoUrl={logoUrl}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cotizacion-${quoteNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setError("Error al generar el PDF.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="size-4" />
          Crear cotización
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear cotización PDF</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Client info */}
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
              <Input id="qb-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Nombre de la empresa cliente" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qb-contact">Contacto</Label>
              <Input id="qb-contact" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Nombre del contacto" />
            </div>
          </div>

          {/* Routes */}
          <div className="space-y-3">
            <Label>Rutas</Label>

            {rows.length > 0 && (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-xs">Origen</th>
                      <th className="text-left px-3 py-2 font-medium text-xs">Destino</th>
                      <th className="text-left px-3 py-2 font-medium text-xs">Estado</th>
                      <th className="text-left px-3 py-2 font-medium text-xs">Costo ($)</th>
                      <th className="text-left px-3 py-2 font-medium text-xs">Unidad</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{row.origin}</td>
                        <td className="px-3 py-2">{row.destination}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.destinationState ?? "—"}</td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min="0"
                            step="100"
                            value={row.cost || ""}
                            onChange={(e) => updateCost(i, e.target.value)}
                            className="w-28 h-8"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">{row.unitLabel}</td>
                        <td className="px-3 py-2">
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

            {/* Add route */}
            {availableRoutes.length > 0 && (
              <div className="flex gap-2">
                <Select value={selectedRouteId} onValueChange={setSelectedRouteId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Seleccionar ruta…" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoutes.map((r) => {
                      const label = unitTypes.find((u) => u.value === r.unitType)?.label ?? r.unitType;
                      return (
                        <SelectItem key={r.id} value={r.id}>
                          {r.origin} → {r.destination} ({label})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={addRoute} disabled={!selectedRouteId}>
                  <Plus className="size-4" />
                </Button>
              </div>
            )}

            {rows.length === 0 && availableRoutes.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay rutas activas disponibles.</p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleDownload} disabled={isGenerating}>
              {isGenerating ? (
                <><Loader2 className="size-4 animate-spin" /> Generando…</>
              ) : (
                <><FileText className="size-4" /> Descargar PDF</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
