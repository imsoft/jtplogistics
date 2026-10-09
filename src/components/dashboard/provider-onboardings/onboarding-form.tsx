"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <form onSubmit={handleSubmit} className="min-w-0 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proveedor</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="ob-legal">Razón social</Label>
            <Input id="ob-legal" required {...text("legalName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ob-comm">Nombre comercial</Label>
            <Input id="ob-comm" required {...text("commercialName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ob-start">Fecha de inicio del alta</Label>
            <Input id="ob-start" type="date" required {...text("startedOn")} className="w-auto" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expediente</CardTitle>
          <CardDescription>
            {progress.done} de {progress.total} resueltos. El alta queda completa sola cuando no hay pendientes.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
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
                        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
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
            <Input id="ob-completed" type="date" {...text("completedOn")} className="w-auto" />
            <p className="text-muted-foreground text-xs">Si la dejas vacía, se pone sola el día en que el expediente quede completo.</p>
          </div>
          <div className="space-y-2 sm:col-span-2 sm:max-w-md">
            <Label htmlFor="ob-alta-by">Persona que autoriza el alta</Label>
            <Input id="ob-alta-by" {...text("altaAuthorizedBy")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contrato</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <Input id="ob-legal-req" type="date" {...text("legalRequestedOn")} className="w-auto" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ob-legal-rec">Fecha de recepción de jurídico</Label>
            <Input id="ob-legal-rec" type="date" {...text("legalReceivedOn")} className="w-auto" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ob-sent">Fecha de envío al proveedor</Label>
            <Input id="ob-sent" type="date" {...text("sentToProviderOn")} className="w-auto" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ob-signed">Fecha de recepción firmado</Label>
            <Input id="ob-signed" type="date" {...text("signedReceivedOn")} className="w-auto" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ob-contract-by">Persona que autoriza el contrato</Label>
            <Input id="ob-contract-by" {...text("contractAuthorizedBy")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comentarios y estado</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
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
                <Label htmlFor="ob-hold-reason">Por qué se detiene</Label>
                <Textarea id="ob-hold-reason" rows={2} {...text("holdReason")} />
                <p className="text-muted-foreground text-xs">Ya no contesta, no tiene seguro, se negó a la visita, documentos en duda…</p>
              </div>
            )}
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
