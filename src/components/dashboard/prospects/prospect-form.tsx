"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppSelect } from "@/components/ui/app-select";
import {
  PROSPECT_COVERAGES,
  PROSPECT_SOURCES,
  PROSPECT_STATUSES,
} from "@/lib/provider-prospects";

export interface ProspectFormData {
  commercialName: string;
  contactName: string;
  phone: string;
  email: string;
  website: string;
  source: string;
  coverage: string;
  status: string;
  legalName: string;
  city: string;
  contactedOn: string;
  notes: string;
  discardReason: string;
}

const EMPTY: ProspectFormData = {
  commercialName: "",
  contactName: "",
  phone: "",
  email: "",
  website: "",
  source: "",
  coverage: "",
  status: "pendiente",
  legalName: "",
  city: "",
  contactedOn: "",
  notes: "",
  discardReason: "",
};

export function ProspectForm({
  initialValues,
  submitLabel,
  cancelHref,
  onSubmit,
  isSubmitting = false,
}: {
  initialValues?: Partial<ProspectFormData>;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (data: ProspectFormData) => void;
  isSubmitting?: boolean;
}) {
  const [form, setForm] = useState<ProspectFormData>({ ...EMPTY, ...initialValues });
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof ProspectFormData) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.commercialName.trim()) {
      setError("Escribe el nombre comercial.");
      return;
    }
    // Descartar sin motivo deja el registro inservible meses después.
    if (form.status === "descartado" && !form.discardReason.trim()) {
      setError("Escribe por qué se descarta.");
      return;
    }
    setError(null);
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="p-name">Nombre comercial</Label>
          <Input id="p-name" value={form.commercialName} onChange={(e) => set("commercialName")(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-legal">Razón social</Label>
          <Input id="p-legal" value={form.legalName} onChange={(e) => set("legalName")(e.target.value)} />
          <p className="text-muted-foreground text-xs">Hace falta al darlo de alta como proveedor.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-contact">Contacto</Label>
          <Input id="p-contact" value={form.contactName} onChange={(e) => set("contactName")(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-phone">Teléfono</Label>
          <Input id="p-phone" value={form.phone} onChange={(e) => set("phone")(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-email">Correo</Label>
          <Input id="p-email" type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-web">Página de internet</Label>
          <Input id="p-web" value={form.website} onChange={(e) => set("website")(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Cómo se consiguió</Label>
          <AppSelect
            value={form.source}
            onValueChange={set("source")}
            options={PROSPECT_SOURCES.map((s) => ({ value: s.value, label: s.label }))}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label>Cobertura</Label>
          <AppSelect
            value={form.coverage}
            onValueChange={set("coverage")}
            options={PROSPECT_COVERAGES.map((c) => ({ value: c.value, label: c.label }))}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-city">Origen</Label>
          <Input id="p-city" value={form.city} onChange={(e) => set("city")(e.target.value)} />
          <p className="text-muted-foreground text-xs">La ciudad desde donde opera: Guadalajara, CDMX, Querétaro…</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-date">Fecha de contacto</Label>
          <Input id="p-date" type="date" value={form.contactedOn} onChange={(e) => set("contactedOn")(e.target.value)} className="w-auto" />
        </div>
        <div className="space-y-2">
          <Label>Etapa</Label>
          <AppSelect
            value={form.status}
            onValueChange={set("status")}
            options={PROSPECT_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
            className="w-full"
          />
        </div>
      </div>

      {form.status === "descartado" && (
        <div className="space-y-2">
          <Label htmlFor="p-discard">Por qué se descarta</Label>
          <Textarea id="p-discard" rows={2} value={form.discardReason} onChange={(e) => set("discardReason")(e.target.value)} />
          <p className="text-muted-foreground text-xs">
            Teléfono equivocado, no le interesa, no corre nuestras rutas, documentos incompletos…
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="p-notes">Comentarios</Label>
        <Textarea id="p-notes" rows={4} value={form.notes} onChange={(e) => set("notes")(e.target.value)} />
        <p className="text-muted-foreground text-xs">Tarifas pactadas, en qué va la negociación, lo que haya que recordar.</p>
      </div>

      {error && <p className="text-destructive text-sm font-medium">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" asChild>
          <Link href={cancelHref}>Cancelar</Link>
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
