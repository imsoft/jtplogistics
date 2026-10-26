"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AppSelect } from "@/components/ui/app-select";
import { formatMxn, formatMxnLive, parseMxn } from "@/lib/utils";
import { BILLING_KIND_LABELS, IVA_WITHHOLDING_OPTIONS, computeTotals, type BillingKind } from "@/lib/billing";
import { money, todayKey, uploadAttachment, type BillingAttachmentRow, type BillingDocument, type UploadedAttachment } from "./billing-shared";

export interface DocumentFormData {
  /** Borrador armado desde un embarque: el folio llega al emitir la factura. */
  draft: boolean;
  fromAlegra: boolean;
  partyName: string;
  partyRfc: string;
  clientId: string;
  series: string;
  folio: string;
  uuid: string;
  issueDate: string;
  dueDate: string;
  currency: "MXN" | "USD";
  exchangeRate: string;
  subtotal: string;
  ivaRate: string;
  withholdingRate: string;
  paymentMethod: "PUE" | "PPD";
  concept: string;
  reference: string;
  notes: string;
}

const IVA_OPTIONS = [
  { value: "0.16", label: "16 %" },
  { value: "0.08", label: "8 % (región fronteriza)" },
  { value: "0", label: "0 % / exento" },
];

function addDays(key: string, days: number) {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function emptyDocumentForm(kind: BillingKind): DocumentFormData {
  const today = todayKey();
  return {
    draft: false,
    fromAlegra: true,
    partyName: "",
    partyRfc: "",
    clientId: "",
    series: "",
    folio: "",
    uuid: "",
    issueDate: today,
    dueDate: addDays(today, 30),
    currency: "MXN",
    exchangeRate: "",
    subtotal: "",
    ivaRate: "0.16",
    withholdingRate: kind === "receivable" ? "0.04" : "0",
    paymentMethod: "PPD",
    concept: "",
    reference: "",
    notes: "",
  };
}

export function documentToForm(d: BillingDocument): DocumentFormData {
  const withholdingRate = d.subtotal > 0 ? d.ivaWithheld / d.subtotal : 0;
  const closest = IVA_WITHHOLDING_OPTIONS.reduce((best, o) =>
    Math.abs(Number(o.value) - withholdingRate) < Math.abs(Number(best.value) - withholdingRate) ? o : best
  );
  return {
    draft: d.draft,
    fromAlegra: d.source === "alegra",
    partyName: d.partyName,
    partyRfc: d.partyRfc ?? "",
    clientId: d.clientId ?? "",
    series: d.series ?? "",
    folio: d.folio ?? "",
    uuid: d.uuid ?? "",
    issueDate: d.issueDate,
    dueDate: d.dueDate,
    currency: d.currency,
    exchangeRate: d.currency === "USD" ? String(d.exchangeRate) : "",
    subtotal: formatMxn(d.subtotal),
    ivaRate: String(d.ivaRate),
    withholdingRate: closest.value,
    paymentMethod: d.paymentMethod,
    concept: d.concept ?? "",
    reference: d.reference ?? "",
    notes: d.notes ?? "",
  };
}

/** Lo que viaja a la API. Los importes los vuelve a calcular el servidor. */
function toPayload(kind: BillingKind, f: DocumentFormData, attachmentIds: string[] = []) {
  return {
    kind,
    attachmentIds,
    draft: f.draft,
    source: f.fromAlegra ? "alegra" : "manual",
    partyName: f.partyName.trim(),
    partyRfc: f.partyRfc.trim(),
    clientId: kind === "receivable" ? f.clientId || null : null,
    series: f.series.trim(),
    folio: f.folio.trim(),
    uuid: f.uuid.trim(),
    issueDate: f.issueDate,
    dueDate: f.dueDate,
    currency: f.currency,
    exchangeRate: f.currency === "USD" ? f.exchangeRate : "1",
    subtotal: f.subtotal,
    ivaRate: f.ivaRate,
    withholdingRate: f.withholdingRate,
    paymentMethod: f.paymentMethod,
    concept: f.concept.trim(),
    reference: f.reference.trim(),
    notes: f.notes.trim(),
  };
}

export function DocumentForm({
  kind,
  initialValues,
  submitLabel,
  cancelHref,
  onSubmit,
  isSubmitting = false,
  lockedAmounts,
}: {
  kind: BillingKind;
  initialValues: DocumentFormData;
  /** Ya tiene su XML: folio, fecha e importes son los del CFDI y no se tocan. */
  lockedAmounts?: { subtotal: number; iva: number; ivaWithheld: number; isrWithheld: number; total: number };
  submitLabel: string;
  cancelHref: string;
  onSubmit: (data: ReturnType<typeof toPayload>) => void;
  isSubmitting?: boolean;
}) {
  const labels = BILLING_KIND_LABELS[kind];
  const [form, setForm] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [parties, setParties] = useState<{ name: string; rfc: string | null; clientId: string | null; creditDays?: number | null }[]>([]);
  // Archivos subidos mientras se captura; se ligan a la factura al guardarla.
  const [files, setFiles] = useState<BillingAttachmentRow[]>([]);
  const [xml, setXml] = useState<NonNullable<UploadedAttachment["fields"]> | null>(null);
  const [uploading, setUploading] = useState(false);
  const lockedByXml = Boolean(lockedAmounts);
  const fromXml = lockedByXml || xml !== null;

  useEffect(() => {
    fetch(`/api/billing/parties?kind=${kind}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setParties(Array.isArray(d) ? d : []))
      .catch(() => setParties([]));
  }, [kind]);

  const set = <K extends keyof DocumentFormData>(key: K) => (value: DocumentFormData[K]) => setForm((f) => ({ ...f, [key]: value }));

  // Los días de crédito del cliente elegido: con ellos se calcula el vencimiento.
  const partyDays = parties.find((p) => p.name.toLowerCase() === form.partyName.trim().toLowerCase())?.creditDays ?? null;

  function onPartyChange(name: string) {
    const match = parties.find((p) => p.name.toLowerCase() === name.trim().toLowerCase());
    setForm((f) => ({
      ...f,
      partyName: name,
      clientId: match?.clientId ?? "",
      partyRfc: match?.rfc && !f.partyRfc ? match.rfc : f.partyRfc,
      ...(match?.creditDays != null && { dueDate: addDays(f.issueDate, match.creditDays) }),
    }));
  }

  function onIssueDateChange(issueDate: string) {
    setForm((f) => ({ ...f, issueDate, ...(partyDays != null && issueDate && { dueDate: addDays(issueDate, partyDays) }) }));
  }

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(list)) {
        if (file.name.toLowerCase().endsWith(".xml") && (xml || files.some((f) => f.kind === "xml"))) {
          toast.error("Ya subiste un XML: quítalo primero si es otro.");
          continue;
        }
        const up = await uploadAttachment(file, kind);
        setFiles((prev) => [...prev, up.attachment]);
        if (up.fields && up.cfdi) applyXml(up.fields, up.cfdi);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo subir el archivo.");
    } finally {
      setUploading(false);
    }
  }

  /** Llena el formulario con el XML. Si el RFC está en el catálogo, se usa ese nombre. */
  function applyXml(f: NonNullable<UploadedAttachment["fields"]>, cfdi: NonNullable<UploadedAttachment["cfdi"]>) {
    const known = parties.find((p) => p.rfc && p.rfc.toUpperCase() === f.partyRfc);
    const withholding = f.subtotal > 0 ? f.ivaWithheld / f.subtotal : 0;
    const closest = IVA_WITHHOLDING_OPTIONS.reduce((best, o) =>
      Math.abs(Number(o.value) - withholding) < Math.abs(Number(best.value) - withholding) ? o : best
    );
    setXml(f);
    setForm((prev) => ({
      ...prev,
      partyName: known?.name ?? f.partyName,
      clientId: known?.clientId ?? "",
      partyRfc: f.partyRfc,
      series: f.series ?? "",
      folio: f.folio ?? "",
      uuid: f.uuid ?? "",
      issueDate: cfdi.issueDate,
      dueDate: addDays(cfdi.issueDate, known?.creditDays ?? 30),
      currency: f.currency,
      exchangeRate: f.currency === "USD" ? String(f.exchangeRate) : "",
      subtotal: formatMxn(f.subtotal),
      ivaRate: f.ivaRate === 0.08 ? "0.08" : f.ivaRate === 0 ? "0" : "0.16",
      withholdingRate: closest.value,
      paymentMethod: f.paymentMethod,
      concept: prev.concept || cfdi.concept || "",
    }));
  }

  async function removeFile(id: string) {
    await fetch(`/api/billing/attachments/${id}`, { method: "DELETE" }).catch(() => null);
    const removed = files.find((f) => f.id === id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
    if (removed?.kind === "xml") setXml(null);
  }

  const totals = useMemo(() => {
    const subtotal = parseMxn(form.subtotal);
    if (subtotal === undefined) return null;
    return computeTotals({ subtotal, ivaRate: Number(form.ivaRate), withholdingRate: Number(form.withholdingRate) });
  }, [form.subtotal, form.ivaRate, form.withholdingRate]);
  // Con XML los importes son exactamente los del CFDI (incluida la retención de ISR).
  const shown = xml
    ? { subtotal: xml.subtotal, iva: xml.iva, ivaWithheld: xml.ivaWithheld, isrWithheld: xml.isrWithheld, total: xml.total }
    : (lockedAmounts ?? (totals && { ...totals, isrWithheld: 0 }));

  // Un borrador se puede guardar tal cual o registrarse ya como factura emitida.
  const startedAsDraft = initialValues.draft;

  function submit(asDraft: boolean) {
    if (!form.partyName.trim()) return setError(`Escribe el ${labels.party.toLowerCase()}.`);
    if (!asDraft && !form.folio.trim() && !xml) return setError("Escribe el folio de la factura.");
    if (!xml && !lockedByXml && (!totals || totals.subtotal <= 0)) return setError("Escribe el subtotal.");
    if (form.dueDate < form.issueDate) return setError("El vencimiento no puede ser antes de la fecha de la factura.");
    if (form.currency === "USD" && !(Number(form.exchangeRate) > 0)) return setError("Escribe el tipo de cambio.");
    setError(null);
    onSubmit(toPayload(kind, { ...form, draft: asDraft && !xml }, files.map((f) => f.id)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit(form.draft);
  }

  return (
    <form onSubmit={handleSubmit} className="min-w-0 space-y-6">
      {startedAsDraft && (
        <div className="rounded-lg border border-violet-500/40 bg-violet-500/5 p-4 text-sm">
          <p className="font-medium">Borrador</p>
          <p className="text-muted-foreground">
            {kind === "receivable"
              ? "Cuando emitas la factura, escribe su folio y su folio fiscal y presiona «Registrar factura emitida». Mientras sea borrador no cuenta en el saldo."
              : "Cuando el transportista mande su factura, escribe su folio y su folio fiscal y presiona «Registrar factura recibida». Mientras sea borrador no cuenta en el saldo."}
          </p>
        </div>
      )}
      {!lockedByXml && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">XML y PDF de la factura</CardTitle>
            <CardDescription>
              Sube el XML y la factura se llena sola: {labels.party.toLowerCase()}, RFC, folio, folio fiscal e importes. El PDF queda guardado junto con ella.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" disabled={uploading} asChild>
                <label className="cursor-pointer">
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
                  Subir XML o PDF
                  <input
                    type="file"
                    accept=".xml,.pdf,application/xml,text/xml,application/pdf"
                    multiple
                    className="sr-only"
                    disabled={uploading}
                    onChange={(e) => {
                      void onFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              </Button>
              {xml && <span className="text-sm text-emerald-700 dark:text-emerald-500">Datos tomados del XML.</span>}
            </div>
            {files.length > 0 && (
              <ul className="space-y-1 text-sm">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center gap-2">
                    <FileText className="text-muted-foreground size-4 shrink-0" />
                    <span className="truncate">{f.fileName}</span>
                    <span className="text-muted-foreground text-xs uppercase">{f.kind}</span>
                    <Button type="button" variant="ghost" size="icon" className="size-6" aria-label={`Quitar ${f.fileName}`} onClick={() => removeFile(f.id)}>
                      <X className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{labels.party} y folio</CardTitle>
          <CardDescription>Los datos tal como vienen en la factura (XML o PDF).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="doc-party">{labels.party}</Label>
            <Input id="doc-party" list="doc-parties" value={form.partyName} onChange={(e) => onPartyChange(e.target.value)} required />
            <datalist id="doc-parties">
              {parties.map((p) => (
                <option key={p.name} value={p.name} />
              ))}
            </datalist>
            <p className="text-muted-foreground text-xs">
              {kind === "receivable"
                ? "Elige un cliente del catálogo o escribe la razón social."
                : "Elige un transportista o escribe la razón social del proveedor."}
              {form.clientId && " Ligada al cliente del catálogo."}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-rfc">RFC</Label>
            <Input id="doc-rfc" value={form.partyRfc} onChange={(e) => set("partyRfc")(e.target.value)} disabled={fromXml} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-series">Serie</Label>
            <Input id="doc-series" value={form.series} onChange={(e) => set("series")(e.target.value)} disabled={fromXml} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-folio">Folio</Label>
            <Input id="doc-folio" value={form.folio} onChange={(e) => set("folio")(e.target.value)} required={!startedAsDraft && !fromXml} disabled={fromXml} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-uuid">Folio fiscal (UUID)</Label>
            <Input id="doc-uuid" value={form.uuid} onChange={(e) => set("uuid")(e.target.value)} disabled={fromXml} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-issue">Fecha de la factura</Label>
            <Input id="doc-issue" type="date" value={form.issueDate} onChange={(e) => onIssueDateChange(e.target.value)} className="w-auto" required disabled={fromXml} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-due">Vence</Label>
            <Input id="doc-due" type="date" value={form.dueDate} onChange={(e) => set("dueDate")(e.target.value)} className="w-auto" required />
            {partyDays != null && (
              <p className="text-muted-foreground text-xs">
                {kind === "receivable" ? "Crédito del cliente" : "Días de pago al transportista"}: {partyDays} días.
              </p>
            )}
            <div className="flex flex-wrap gap-1">
              {[15, 30, 45, 60].map((n) => (
                <Button key={n} type="button" size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => set("dueDate")(addDays(form.issueDate, n))}>
                  {n} días
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Método de pago</Label>
            <AppSelect
              value={form.paymentMethod}
              onValueChange={(v) => set("paymentMethod")(v === "PUE" ? "PUE" : "PPD")}
              options={[
                { value: "PPD", label: "PPD · En parcialidades o diferido" },
                { value: "PUE", label: "PUE · Una sola exhibición" },
              ]}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Importes</CardTitle>
          {fromXml && <CardDescription>Son los del XML: no se cambian a mano.</CardDescription>}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Moneda</Label>
            <AppSelect
              value={form.currency}
              onValueChange={(v) => set("currency")(v === "USD" ? "USD" : "MXN")}
              disabled={fromXml}
              options={[
                { value: "MXN", label: "Pesos (MXN)" },
                { value: "USD", label: "Dólares (USD)" },
              ]}
              className="w-full"
            />
          </div>
          {form.currency === "USD" && (
            <div className="space-y-2">
              <Label htmlFor="doc-rate">Tipo de cambio</Label>
              <Input id="doc-rate" inputMode="decimal" value={form.exchangeRate} onChange={(e) => set("exchangeRate")(e.target.value.replace(/[^\d.]/g, ""))} disabled={fromXml} />
              <p className="text-muted-foreground text-xs">Pesos por dólar el día de la factura.</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="doc-subtotal">Subtotal</Label>
            <Input id="doc-subtotal" inputMode="decimal" value={form.subtotal} onChange={(e) => set("subtotal")(formatMxnLive(e.target.value))} required disabled={fromXml} />
          </div>
          <div className="space-y-2">
            <Label>IVA</Label>
            <AppSelect value={form.ivaRate} onValueChange={(v) => set("ivaRate")(v || "0.16")} options={IVA_OPTIONS} className="w-full" disabled={fromXml} />
          </div>
          <div className="space-y-2">
            <Label>Retención de IVA</Label>
            <AppSelect value={form.withholdingRate} onValueChange={(v) => set("withholdingRate")(v || "0")} options={IVA_WITHHOLDING_OPTIONS} className="w-full" disabled={fromXml} />
          </div>
          <div className="rounded-lg border bg-muted/30 p-4 text-sm sm:col-span-2 lg:col-span-4">
            {shown ? (
              <div className="flex flex-wrap gap-x-8 gap-y-1">
                <span>Subtotal: <b className="tabular-nums">{money(shown.subtotal, form.currency)}</b></span>
                <span>IVA: <b className="tabular-nums">{money(shown.iva, form.currency)}</b></span>
                {shown.ivaWithheld > 0 && <span>Retención IVA: <b className="tabular-nums">-{money(shown.ivaWithheld, form.currency)}</b></span>}
                {shown.isrWithheld > 0 && <span>Retención ISR: <b className="tabular-nums">-{money(shown.isrWithheld, form.currency)}</b></span>}
                <span>Total: <b className="tabular-nums">{money(shown.total, form.currency)}</b></span>
              </div>
            ) : (
              <span className="text-muted-foreground">Escribe el subtotal para ver el total.</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="doc-concept">Concepto</Label>
            <Input id="doc-concept" value={form.concept} onChange={(e) => set("concept")(e.target.value)} />
            <p className="text-muted-foreground text-xs">Por ejemplo: flete Guadalajara – Monterrey.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-ref">Referencia</Label>
            <Input id="doc-ref" value={form.reference} onChange={(e) => set("reference")(e.target.value)} />
            <p className="text-muted-foreground text-xs">ECO o embarques que cubre.</p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="doc-notes">Notas</Label>
            <Textarea id="doc-notes" rows={2} value={form.notes} onChange={(e) => set("notes")(e.target.value)} />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Switch id="doc-alegra" checked={form.fromAlegra} onCheckedChange={(v) => set("fromAlegra")(Boolean(v))} />
            <Label htmlFor="doc-alegra">Viene de Alegra</Label>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-destructive text-sm font-medium">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" asChild>
          <Link href={cancelHref}>Cancelar</Link>
        </Button>
        {startedAsDraft ? (
          <>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => submit(true)}>
              Guardar borrador
            </Button>
            <Button type="button" disabled={isSubmitting} onClick={() => submit(false)}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {kind === "receivable" ? "Registrar factura emitida" : "Registrar factura recibida"}
            </Button>
          </>
        ) : (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {submitLabel}
          </Button>
        )}
      </div>
    </form>
  );
}
