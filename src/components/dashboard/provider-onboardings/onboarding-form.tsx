"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Check, FileSignature, FolderCheck, Loader2, MessageSquareText, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionBar } from "@/components/ui/form-actions";
import { FormSection, RequiredText } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppSelect } from "@/components/ui/app-select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  CONTRACT_STATUSES,
  DOC_STATUSES,
  ONBOARDING_DOCS,
  docProgress,
  type DocRecord,
  type DocStatus,
} from "@/lib/provider-onboardings";
import { DatePicker } from "@/components/ui/date-picker";

export interface OnboardingFormData {
  legalName: string;
  commercialName: string;
  prospectId: string | null;
  startedOn: string;
  docs: DocRecord;
  completedOn: string;
  altaAuthorizedBy: string;
  contractStatus: string;
  legalRequestedOn: string;
  legalReceivedOn: string;
  sentToProviderOn: string;
  signedReceivedOn: string;
  contractAuthorizedBy: string;
  notes: string;
  purchasingNotes: string;
  onHold: boolean;
  holdReason: string;
}

export function emptyOnboardingForm(today: string): OnboardingFormData {
  return {
    legalName: "",
    commercialName: "",
    prospectId: null,
    startedOn: today,
    docs: Object.fromEntries(ONBOARDING_DOCS.map((d) => [d.key, "pending"])) as DocRecord,
    completedOn: "",
    altaAuthorizedBy: "",
    contractStatus: "not_requested",
    legalRequestedOn: "",
    legalReceivedOn: "",
    sentToProviderOn: "",
    signedReceivedOn: "",
    contractAuthorizedBy: "",
    notes: "",
    purchasingNotes: "",
    onHold: false,
    holdReason: "",
  };
}

const DOC_TONE: Record<DocStatus, string> = {
  pending: "",
  received: "border-green-600 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200",
  not_applicable: "bg-muted text-muted-foreground",
};

export function OnboardingForm({
  initialValues,
  submitLabel,
  cancelHref,
  onSubmit,
  isSubmitting = false,
}: {
  initialValues: OnboardingFormData;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (data: OnboardingFormData) => void;
  isSubmitting?: boolean;
}) {
  const [form, setForm] = useState<OnboardingFormData>(initialValues);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof OnboardingFormData>(key: K) => (value: OnboardingFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const text = (key: keyof OnboardingFormData) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key)(e.target.value as never),
  });

  const progress = docProgress(form.docs);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.legalName.trim()) return setError("Escribe la razón social.");
    if (!form.commercialName.trim()) return setError("Escribe el nombre comercial.");
    if (!form.startedOn) return setError("Escribe la fecha de inicio del alta.");
    if (form.onHold && form.holdReason.trim().length < 3) return setError("Escribe por qué se detiene el alta.");
    setError(null);
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="min-w-0 space-y-4 sm:space-y-5">
      <FormSection icon={Building2} title="Proveedor" description="A quién se está dando de alta." className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="ob-legal">
              <RequiredText>Razón social</RequiredText>
            </Label>
            <Input id="ob-legal" required {...text("legalName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ob-comm">
              <RequiredText>Nombre comercial</RequiredText>
            </Label>
            <Input id="ob-comm" required {...text("commercialName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ob-start">
              <RequiredText>Fecha de inicio del alta</RequiredText>
            </Label>
            <DatePicker id="ob-start" required value={form.startedOn as string} onChange={(v) => set("startedOn")(v as never)} />
          </div>
      </FormSection>

      <FormSection
        icon={FolderCheck}
        title="Expediente"
        description="El alta queda completa sola cuando no hay pendientes."
        aside={
          <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide", progress.done === progress.total ? "bg-green-100 text-green-800" : "bg-primary/[0.08] text-primary")}>
            {progress.done} de {progress.total} resueltos
          </span>
        }
        className="grid gap-3 sm:grid-cols-2"
      >
          {ONBOARDING_DOCS.map((d) => (
            <div key={d.key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
              <span className="text-sm font-medium">{d.label}</span>
              <div className="flex gap-1" role="radiogroup" aria-label={d.label}>
                {DOC_STATUSES.map((s) => {
                  const active = form.docs[d.key] === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => set("docs")({ ...form.docs, [d.key]: s.value })}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium uppercase tracking-wide transition-colors",
                        active ? DOC_TONE[s.value] || "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:bg-accent"
                      )}
                    >
                      {s.value === "received" && <Check className="size-3 stroke-[3]" aria-hidden />}
                      {s.value === "not_applicable" && <Minus className="size-3" aria-hidden />}
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="space-y-2 sm:col-span-2 sm:max-w-md">
            <Label htmlFor="ob-completed">Fecha de alta completa</Label>
            <DatePicker id="ob-completed" value={form.completedOn as string} onChange={(v) => set("completedOn")(v as never)} />
            <p className="text-muted-foreground text-xs">Si la dejas vacía, se pone sola el día en que el expediente quede completo.</p>
          </div>
          <div className="space-y-2 sm:col-span-2 sm:max-w-md">
            <Label htmlFor="ob-alta-by">Persona que autoriza el alta</Label>
            <Input id="ob-alta-by" {...text("altaAuthorizedBy")} />
          </div>
      </FormSection>

      <FormSection icon={FileSignature} title="Contrato" description="El camino del contrato con jurídico y el proveedor." className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 lg:col-span-3 lg:max-w-md">
            <Label>Estado del contrato</Label>
            <AppSelect
              value={form.contractStatus}
              onValueChange={(v) => set("contractStatus")(v || "not_requested")}
              options={CONTRACT_STATUSES.map((c) => ({ value: c.value, label: c.label }))}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ob-legal-req">Fecha de solicitud a jurídico</Label>
            <DatePicker id="ob-legal-req" value={form.legalRequestedOn as string} onChange={(v) => set("legalRequestedOn")(v as never)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ob-legal-rec">Fecha de recepción de jurídico</Label>
            <DatePicker id="ob-legal-rec" value={form.legalReceivedOn as string} onChange={(v) => set("legalReceivedOn")(v as never)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ob-sent">Fecha de envío al proveedor</Label>
            <DatePicker id="ob-sent" value={form.sentToProviderOn as string} onChange={(v) => set("sentToProviderOn")(v as never)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ob-signed">Fecha de recepción firmado</Label>
            <DatePicker id="ob-signed" value={form.signedReceivedOn as string} onChange={(v) => set("signedReceivedOn")(v as never)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ob-contract-by">Persona que autoriza el contrato</Label>
            <Input id="ob-contract-by" {...text("contractAuthorizedBy")} />
          </div>
      </FormSection>

      <FormSection icon={MessageSquareText} title="Comentarios y estado" description="Notas de Finanzas y Compras, y si el alta está detenida." className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ob-notes">Comentarios</Label>
            <Textarea id="ob-notes" rows={3} {...text("notes")} />
            <p className="text-muted-foreground text-xs">Lo que Finanzas quiera dejar anotado del alta o del contrato.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ob-pnotes">Comentarios de compras</Label>
            <Textarea id="ob-pnotes" rows={3} {...text("purchasingNotes")} />
          </div>
          <div className="space-y-3 sm:col-span-2">
            <div className="flex items-center gap-3">
              <Switch id="ob-hold" checked={form.onHold} onCheckedChange={(v) => set("onHold")(Boolean(v))} />
              <Label htmlFor="ob-hold">Alta detenida</Label>
            </div>
            {form.onHold && (
              <div className="space-y-2 sm:max-w-md">
                <Label htmlFor="ob-hold-reason">
                  <RequiredText>Por qué se detiene</RequiredText>
                </Label>
                <Textarea id="ob-hold-reason" rows={2} {...text("holdReason")} />
                <p className="text-muted-foreground text-xs">Ya no contesta, no tiene seguro, se negó a la visita, documentos en duda…</p>
              </div>
            )}
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
