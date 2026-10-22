"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppSelect } from "@/components/ui/app-select";
import { formatMxnLive, parseMxn } from "@/lib/utils";
import { LEAD_SOURCES, LEAD_STAGES } from "@/lib/client-leads";

export interface LeadFormData {
  companyName: string;
  contactName: string;
  position: string;
  phone: string;
  email: string;
  city: string;
  industry: string;
  source: string;
  stage: string;
  estimatedMonthly: string;
  ownerId: string;
  nextAction: string;
  nextFollowUpOn: string;
  notes: string;
  lostReason: string;
}

export const EMPTY_LEAD: LeadFormData = {
  companyName: "",
  contactName: "",
  position: "",
  phone: "",
  email: "",
  city: "",
  industry: "",
  source: "",
  stage: "prospecto",
  estimatedMonthly: "",
  ownerId: "",
  nextAction: "",
  nextFollowUpOn: "",
  notes: "",
  lostReason: "",
};

/** Lo que viaja a la API: dinero como número y vacíos como null. */
export function leadPayload(f: LeadFormData) {
  const orNull = (v: string) => v.trim() || null;
  return {
    companyName: f.companyName.trim(),
    contactName: orNull(f.contactName),
    position: orNull(f.position),
    phone: orNull(f.phone),
    email: orNull(f.email),
    city: orNull(f.city),
    industry: orNull(f.industry),
    source: orNull(f.source),
    stage: f.stage || "prospecto",
    estimatedMonthly: f.estimatedMonthly.trim() ? parseMxn(f.estimatedMonthly) ?? null : null,
    ownerId: orNull(f.ownerId),
    nextAction: orNull(f.nextAction),
    nextFollowUpOn: orNull(f.nextFollowUpOn),
    notes: orNull(f.notes),
    lostReason: orNull(f.lostReason),
  };
}

function useOwners() {
  const [owners, setOwners] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    fetch("/api/client-leads/owners")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setOwners(Array.isArray(d) ? d : []))
      .catch(() => setOwners([]));
  }, []);
  return owners;
}

export function LeadForm({
  initialValues,
  submitLabel,
  cancelHref,
  onSubmit,
  isSubmitting = false,
}: {
  initialValues?: Partial<LeadFormData>;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (data: ReturnType<typeof leadPayload>) => void;
  isSubmitting?: boolean;
}) {
  const [form, setForm] = useState<LeadFormData>({ ...EMPTY_LEAD, ...initialValues });
  const [error, setError] = useState<string | null>(null);
  const owners = useOwners();

  const set = (key: keyof LeadFormData) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  const text = (key: keyof LeadFormData) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key)(e.target.value),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyName.trim()) return setError("Escribe el nombre de la empresa.");
    if (form.stage === "perdido" && !form.lostReason.trim()) return setError("Escribe por qué se perdió.");
    if (form.estimatedMonthly.trim() && parseMxn(form.estimatedMonthly) === undefined) {
      return setError("La venta mensual estimada no es un número válido.");
    }
    setError(null);
    onSubmit(leadPayload(form));
  }

  return (
    <form onSubmit={handleSubmit} className="min-w-0 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Empresa y contacto</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="lead-company">Empresa</Label>
            <Input id="lead-company" required {...text("companyName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-industry">Giro</Label>
            <Input id="lead-industry" {...text("industry")} />
            <p className="text-muted-foreground text-xs">Alimentos, autopartes, retail…</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-city">Ciudad</Label>
            <Input id="lead-city" {...text("city")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-contact">Nombre de contacto</Label>
            <Input id="lead-contact" {...text("contactName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-position">Puesto</Label>
            <Input id="lead-position" {...text("position")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-phone">Teléfono</Label>
            <Input id="lead-phone" type="tel" inputMode="tel" {...text("phone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-email">Correo</Label>
            <Input id="lead-email" type="email" className="text-email" {...text("email")} />
          </div>
          <div className="space-y-2">
            <Label>Cómo llegó</Label>
            <AppSelect
              value={form.source}
              onValueChange={set("source")}
              options={LEAD_SOURCES.map((s) => ({ value: s.value, label: s.label }))}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seguimiento</CardTitle>
          <CardDescription>
            Al responsable le llega un recordatorio el día del próximo seguimiento.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Etapa</Label>
            <AppSelect
              value={form.stage}
              onValueChange={(v) => set("stage")(v || "prospecto")}
              options={LEAD_STAGES.map((s) => ({ value: s.value, label: s.label }))}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label>Responsable</Label>
            <AppSelect
              value={form.ownerId}
              onValueChange={set("ownerId")}
              options={owners.map((o) => ({ value: o.id, label: o.name }))}
              className="w-full"
            />
            <p className="text-muted-foreground text-xs">Si lo dejas vacío, quedas tú.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-estimated">Venta mensual estimada</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">$</span>
              <Input
                id="lead-estimated"
                inputMode="decimal"
                value={form.estimatedMonthly}
                onChange={(e) => set("estimatedMonthly")(formatMxnLive(e.target.value))}
              />
            </div>
            <p className="text-muted-foreground text-xs">Lo que facturaría al mes si se cierra, en pesos.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-next-date">Próximo seguimiento</Label>
            <Input id="lead-next-date" type="date" className="w-auto" {...text("nextFollowUpOn")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="lead-next-action">Qué toca hacer</Label>
            <Input id="lead-next-action" {...text("nextAction")} />
            <p className="text-muted-foreground text-xs">Llamar para confirmar volumen, mandar cotización, visitar planta…</p>
          </div>
          {form.stage === "perdido" && (
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <Label htmlFor="lead-lost">Por qué se perdió</Label>
              <Textarea id="lead-lost" rows={2} {...text("lostReason")} />
            </div>
          )}
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="lead-notes">Notas</Label>
            <Textarea id="lead-notes" rows={3} {...text("notes")} />
            <p className="text-muted-foreground text-xs">Rutas que mueve, volumen, con quién trabaja hoy…</p>
          </div>
        </CardContent>
      </Card>

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
