"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, CalendarClock, Loader2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionBar } from "@/components/ui/form-actions";
import { FormSection, RequiredText } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppSelect } from "@/components/ui/app-select";
import { formatMxnLive, parseMxn } from "@/lib/utils";
import { LEAD_SOURCES, LEAD_STAGES } from "@/lib/client-leads";
import { DatePicker } from "@/components/ui/date-picker";

export interface LeadFormData {
  companyName: string;
  contactName: string;
  position: string;
  phone: string;
  email: string;
  city: string;
  industry: string;
  rfc: string;
  address: string;
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
  rfc: "",
  address: "",
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
    rfc: orNull(f.rfc),
    address: orNull(f.address),
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
    <form onSubmit={handleSubmit} className="min-w-0 space-y-4 sm:space-y-5">
      <FormSection icon={Building2} title="Empresa" description="A quién le queremos vender y dónde está." className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="lead-company">
            <RequiredText>Empresa</RequiredText>
          </Label>
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
          <Label htmlFor="lead-rfc">RFC</Label>
          <Input id="lead-rfc" maxLength={13} {...text("rfc")} />
          <p className="text-muted-foreground text-xs">12 caracteres si es empresa, 13 si es persona física.</p>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="lead-address">Dirección</Label>
          <Input id="lead-address" {...text("address")} />
          <p className="text-muted-foreground text-xs">Calle, número, colonia, código postal.</p>
        </div>
      </FormSection>

      <FormSection icon={UserRound} title="Contacto" description="Con quién se habla y cómo llegó a nosotros." className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
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
      </FormSection>

      <FormSection
        icon={CalendarClock}
        title="Seguimiento"
        description="Al responsable le llega un recordatorio el día del próximo seguimiento."
        className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3"
      >
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
          <DatePicker id="lead-next-date" value={form.nextFollowUpOn} onChange={(v) => set("nextFollowUpOn")(v)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="lead-next-action">Qué toca hacer</Label>
          <Input id="lead-next-action" {...text("nextAction")} />
          <p className="text-muted-foreground text-xs">Llamar para confirmar volumen, mandar cotización, visitar planta…</p>
        </div>
        {form.stage === "perdido" && (
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="lead-lost">
              <RequiredText>Por qué se perdió</RequiredText>
            </Label>
            <Textarea id="lead-lost" rows={2} {...text("lostReason")} />
          </div>
        )}
        <div className="space-y-2 sm:col-span-2 lg:col-span-3">
          <Label htmlFor="lead-notes">Notas</Label>
          <Textarea id="lead-notes" rows={3} {...text("notes")} />
          <p className="text-muted-foreground text-xs">Rutas que mueve, volumen, con quién trabaja hoy…</p>
        </div>
      </FormSection>

      {error && <p className="text-destructive text-sm font-medium">{error}</p>}

      <ActionBar sticky>
        <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
          <Link href={cancelHref}>Cancelar</Link>
        </Button>
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          {submitLabel}
        </Button>
      </ActionBar>
    </form>
  );
}
