"use client";

import { useState, useEffect, useCallback } from "react";
import { FormSkeleton } from "@/components/ui/skeletons";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface QuoteRow {
  origin: string;
  destination: string;
  destinationState: string | null;
  cost: number;
  unitLabel: string;
}

interface GeneratedQuote {
  id: string;
  quoteNumber: string;
  company: string;
  contact: string;
  phone: string | null;
  validUntil: string;
  rows: QuoteRow[];
}

export default function EditQuotePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [quote, setQuote] = useState<GeneratedQuote | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [rows, setRows] = useState<QuoteRow[]>([]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/generated-quotes/${id}`);
    if (!res.ok) { setError("No se pudo cargar la cotización."); setIsLoaded(true); return; }
    const data: GeneratedQuote = await res.json();
    setQuote(data);
    setCompany(data.company);
    setContact(data.contact);
    setPhone(data.phone ?? "");
    setValidUntil(data.validUntil);
    setRows(data.rows as QuoteRow[]);
    setIsLoaded(true);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cleanRows = rows
      .map((r) => ({
        ...r,
        origin: r.origin.trim(),
        destination: r.destination.trim(),
        destinationState: r.destinationState?.trim() || null,
        unitLabel: r.unitLabel.trim(),
      }))
      .filter((r) => r.origin || r.destination || r.unitLabel || r.cost > 0);
    if (cleanRows.some((r) => !r.origin || !r.destination)) {
      setError("Todas las rutas deben tener origen y destino.");
      return;
    }
    if (cleanRows.length === 0) {
      setError("Agrega al menos una ruta.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/generated-quotes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, contact, phone: phone || null, validUntil, rows: cleanRows }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Error al guardar");
      }
      router.push("/admin/dashboard/quotes");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await fetch(`/api/admin/generated-quotes/${id}`, { method: "DELETE" });
      router.push("/admin/dashboard/quotes");
    } catch {
      setIsDeleting(false);
    }
  }

  function updateRow(i: number, patch: Partial<QuoteRow>) {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }

  function updateCost(i: number, value: string) {
    const cost = parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
    updateRow(i, { cost });
  }

  function addRow() {
    setRows((prev) => [...prev, { origin: "", destination: "", destinationState: null, cost: 0, unitLabel: "" }]);
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  if (!isLoaded) return <FormSkeleton />;
  if (error && !quote) return <p className="text-sm text-destructive">{error}</p>;

  return (
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/admin/dashboard/quotes"><ChevronLeft className="size-4" /></Link>
          </Button>
          <div className="min-w-0">
            <h1 className="page-heading truncate">Editar cotización</h1>
            <p className="text-muted-foreground text-xs">{quote?.quoteNumber}</p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={isDeleting}>
              <Trash2 className="size-4" />
              Eliminar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar cotización?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará la cotización {quote?.quoteNumber} del historial.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos del cliente */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="company">Compañía</Label>
            <Input id="company" required value={company} onChange={(e) => setCompany(e.target.value)} disabled={isSubmitting} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact">Contacto</Label>
            <Input id="contact" required value={contact} onChange={(e) => setContact(e.target.value)} disabled={isSubmitting} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isSubmitting} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="validUntil">Vigencia</Label>
            <Input id="validUntil" type="date" required value={validUntil} onChange={(e) => setValidUntil(e.target.value)} disabled={isSubmitting} />
          </div>
        </div>

        {/* Rutas: todos los campos editables */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Rutas incluidas</Label>
            <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={isSubmitting}>
              <Plus className="size-3.5" />
              Agregar ruta
            </Button>
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-6 text-center">
              No hay rutas. Agrega al menos una.
            </p>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-xs">Origen</th>
                    <th className="text-left px-3 py-2 font-medium text-xs">Destino</th>
                    <th className="text-left px-3 py-2 font-medium text-xs">Estado</th>
                    <th className="text-left px-3 py-2 font-medium text-xs">Costo ($)</th>
                    <th className="text-left px-3 py-2 font-medium text-xs">Unidad</th>
                    <th className="px-2 py-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2">
                        <Input
                          value={row.origin}
                          onChange={(e) => updateRow(i, { origin: e.target.value })}
                          disabled={isSubmitting}
                          className="h-8 min-w-28"
                          aria-label={`Origen de la ruta ${i + 1}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={row.destination}
                          onChange={(e) => updateRow(i, { destination: e.target.value })}
                          disabled={isSubmitting}
                          className="h-8 min-w-28"
                          aria-label={`Destino de la ruta ${i + 1}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={row.destinationState ?? ""}
                          onChange={(e) => updateRow(i, { destinationState: e.target.value || null })}
                          disabled={isSubmitting}
                          className="h-8 min-w-24"
                          aria-label={`Estado de destino de la ruta ${i + 1}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number" min="0" step="100"
                          value={row.cost || ""}
                          onChange={(e) => updateCost(i, e.target.value)}
                          disabled={isSubmitting}
                          className="w-28 h-8"
                          aria-label={`Costo de la ruta ${i + 1}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={row.unitLabel}
                          onChange={(e) => updateRow(i, { unitLabel: e.target.value })}
                          disabled={isSubmitting}
                          className="h-8 min-w-24"
                          aria-label={`Unidad de la ruta ${i + 1}`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => removeRow(i)}
                          disabled={isSubmitting}
                          aria-label={`Eliminar ruta ${i + 1}`}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/dashboard/quotes">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
