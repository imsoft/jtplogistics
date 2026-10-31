"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { pdf } from "@react-pdf/renderer";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SAVE_CHANGES, useConfirm } from "@/components/ui/confirm-provider";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ActionBar } from "@/components/ui/form-actions";
import { FormSection } from "@/components/ui/form-section";
import { Calculator, FileText, Landmark, ListOrdered, ReceiptText, Sigma, Wallet } from "lucide-react";
import { ClientPicker } from "@/components/dashboard/resources/client-picker";
import { formatMxn } from "@/lib/utils";
import {
  ADV_BRACKETS,
  EXPENSE_FIELDS,
  computeMaritimeQuote,
  emptyBrackets,
  emptyExpenses,
  type AdvKey,
  type ExpenseKey,
  type MaritimeQuoteInput,
} from "@/lib/maritime-quote";
import { MaritimeQuotePdf } from "@/components/dashboard/maritime-quotes/maritime-quote-pdf";

function emptyInput(): MaritimeQuoteInput {
  return {
    reference: "",
    client: "",
    invoiceNumbers: "",
    invoiceDate: "",
    clientName: "",
    fractions: ["", "", ""],
    eta: "",
    invoiceValueUsd: 0,
    internationalFreightUsd: 0,
    insuranceUsd: 0,
    othersUsd: 0,
    exchangeRate: 0,
    brackets: emptyBrackets(),
    expenses: emptyExpenses(),
    restricciones: "",
    bankName: "",
    clabe: "",
    accountNumber: "",
    elaboro: "",
    aprobo: "",
    validUntil: "",
  };
}

interface Props {
  mode: "new" | "edit";
  quoteId?: string;
  backHref: string;
  initialInput?: MaritimeQuoteInput;
  /** Estado guardado; con "borrador" la edición no exige cliente. */
  initialStatus?: string;
  /** Catálogo de clientes del panel; llena cliente y razón social al elegir. */
  clientsEndpoint?: string;
}

export function MaritimeQuoteForm({ mode, quoteId, backHref, initialInput, initialStatus, clientsEndpoint }: Props) {
  const isDraft = initialStatus === "borrador";
  const router = useRouter();
  const confirm = useConfirm();
  const [input, setInput] = useState<MaritimeQuoteInput>(initialInput ?? emptyInput());
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // En alta: traer referencia automática y fijar vigencia por defecto (hoy + 1 día como ejemplo del documento).
  useEffect(() => {
    if (mode !== "new") return;
    let cancelled = false;
    async function init() {
      const today = new Date().toISOString().split("T")[0];
      try {
        const res = await fetch("/api/maritime-quotes/next-number");
        const json = res.ok ? ((await res.json()) as { reference: string }) : { reference: "" };
        if (!cancelled) {
          setInput((prev) => ({ ...prev, reference: json.reference, validUntil: prev.validUntil || today }));
        }
      } catch {
        if (!cancelled) setInput((prev) => ({ ...prev, validUntil: prev.validUntil || today }));
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const computed = useMemo(() => computeMaritimeQuote(input), [input]);

  function setField<K extends keyof MaritimeQuoteInput>(key: K, value: MaritimeQuoteInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }
  function setBracket(key: AdvKey, value: number) {
    setInput((prev) => ({ ...prev, brackets: { ...prev.brackets, [key]: value } }));
  }
  function setExpense(key: ExpenseKey, value: number) {
    setInput((prev) => ({ ...prev, expenses: { ...prev.expenses, [key]: value } }));
  }
  function setFraction(idx: number, value: string) {
    setInput((prev) => {
      const fractions = [...prev.fractions];
      fractions[idx] = value;
      return { ...prev, fractions };
    });
  }

  /** Con asDraft no se exige cliente: el borrador es lo que va a medias. */
  function validate(asDraft = false): string | null {
    if (!input.reference.trim()) return "Falta la referencia.";
    if (!asDraft && !input.client.trim()) return "Falta el cliente.";
    if (!input.validUntil) return "Falta la vigencia.";
    return null;
  }

  async function handleGeneratePdf() {
    setIsGenerating(true);
    try {
      const logoUrl = window.location.origin + "/images/logo/jtp-logistics.png";
      const blob = await pdf(<MaritimeQuotePdf input={input} computed={computed} logoUrl={logoUrl} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Cotizacion-Maritima-${input.reference || "sin-ref"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar el PDF");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSave(asDraft = false) {
    // Editar un borrador tampoco exige cliente todavía.
    const err = validate(asDraft || (mode === "edit" && isDraft));
    if (err) {
      toast.error(err);
      return;
    }
    if (mode === "edit" && !(await confirm(SAVE_CHANGES))) return;
    setIsSaving(true);
    try {
      const payload = {
        reference: input.reference,
        client: input.client,
        validUntil: input.validUntil,
        data: input,
        // Solo al crear: en la edición el estado se queda como estaba.
        ...(mode === "new" && { status: asDraft ? "borrador" : "enviada" }),
      };
      const res =
        mode === "new"
          ? await fetch("/api/maritime-quotes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/maritime-quotes/${quoteId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Error al guardar");
      }
      toast.success(
        asDraft ? "Borrador guardado" : mode === "new" ? "Cotización creada" : "Cotización actualizada"
      );
      router.push(backHref);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setIsSaving(false);
    }
  }

  const leftExpenses = EXPENSE_FIELDS.filter((f) => f.column === "left");
  const rightExpenses = EXPENSE_FIELDS.filter((f) => f.column === "right");

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── Datos generales ── */}
      <FormSection icon={FileText} title="Datos generales" className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Referencia" help="Por ejemplo: 202605-07.">
            <Input value={input.reference} onChange={(e) => setField("reference", e.target.value)} />
          </Field>
          {clientsEndpoint && (
            <ClientPicker
              endpoint={clientsEndpoint}
              onPick={(c) => {
                setField("client", c.name);
                setField("clientName", c.legalName ?? c.name);
              }}
            />
          )}
          <Field label="Cliente">
            <Input value={input.client} onChange={(e) => setField("client", e.target.value)} />
          </Field>
          <Field label="Vigencia (hasta)">
            <DatePicker
              value={input.validUntil}
              onChange={(value) => setField("validUntil", value)}
            />
          </Field>
          <Field label="Factura(s) No.(s)">
            <Input value={input.invoiceNumbers} onChange={(e) => setField("invoiceNumbers", e.target.value)} />
          </Field>
          <Field label="Fecha de factura" help="Como dd/mm/aaaa.">
            <Input value={input.invoiceDate} onChange={(e) => setField("invoiceDate", e.target.value)} />
          </Field>
          <Field label="Clientes (razón social)">
            <Input value={input.clientName} onChange={(e) => setField("clientName", e.target.value)} />
          </Field>
          <Field label="ETA">
            <Input value={input.eta} onChange={(e) => setField("eta", e.target.value)} />
          </Field>
      </FormSection>

      {/* ── Fracciones ── */}
      <FormSection icon={ListOrdered} title="Fracciones sugeridas" className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Field key={i} label={`Fracción ${i + 1}`}>
              <Input value={input.fractions[i] ?? ""} onChange={(e) => setFraction(i, e.target.value)} />
            </Field>
          ))}
      </FormSection>

      {/* ── Valor en aduana ── */}
      <FormSection icon={Calculator} title="Cálculo del valor en aduana (USD)" className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Money label="Valor Factura" value={input.invoiceValueUsd} onChange={(v) => setField("invoiceValueUsd", v)} />
          <Money label="Flete Internacional" value={input.internationalFreightUsd} onChange={(v) => setField("internationalFreightUsd", v)} />
          <Money label="Seguro" value={input.insuranceUsd} onChange={(v) => setField("insuranceUsd", v)} />
          <Money label="Otros" value={input.othersUsd} onChange={(v) => setField("othersUsd", v)} />
          <Money label="Tipo de Cambio" value={input.exchangeRate} onChange={(v) => setField("exchangeRate", v)} step="0.0001" />
          <Field label="Total Incrementables (auto)">
            <Input readOnly disabled value={`$${formatMxn(computed.totalIncrementables)}`} className="bg-muted" />
          </Field>
      </FormSection>

      {/* ── Valor en aduana por fracción (ADV) ── */}
      <FormSection icon={ReceiptText} title="Valor en aduana por fracción (moneda extranjera) → IGI" className="space-y-2">
          <div className="hidden grid-cols-[80px_1fr_1fr_1fr] gap-3 text-xs font-medium text-muted-foreground sm:grid">
            <span>ADV</span>
            <span>Valor (EUR/USD)</span>
            <span className="text-right">Pesos (auto)</span>
            <span className="text-right">IGI (auto)</span>
          </div>
          {ADV_BRACKETS.map((b) => {
            const cb = computed.brackets.find((x) => x.key === b.key)!;
            return (
              <div key={b.key} className="grid grid-cols-2 items-center gap-3 sm:grid-cols-[80px_1fr_1fr_1fr]">
                <span className="text-sm font-semibold">{b.label}</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={input.brackets[b.key] === 0 ? "" : input.brackets[b.key]}
                  onChange={(e) => setBracket(b.key, Number(e.target.value) || 0)}
                />
                <span className="hidden text-right text-sm text-muted-foreground sm:block">${formatMxn(cb.valuePesos)}</span>
                <span className="hidden text-right text-sm text-muted-foreground sm:block">${formatMxn(cb.igi)}</span>
              </div>
            );
          })}
      </FormSection>

      {/* ── Gastos e impuestos ── */}
      <FormSection icon={Wallet} title="Gastos e impuestos (captura manual)" className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Columna 1</p>
            {leftExpenses.map((f) => (
              <Money key={f.key} label={f.label} value={input.expenses[f.key]} onChange={(v) => setExpense(f.key, v)} />
            ))}
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Columna 2</p>
            {rightExpenses.map((f) => (
              <Money key={f.key} label={f.label} value={input.expenses[f.key]} onChange={(v) => setExpense(f.key, v)} />
            ))}
          </div>
      </FormSection>

      {/* ── Pie del documento ── */}
      <FormSection icon={Landmark} title="Restricciones y datos bancarios" className="space-y-4">
          <Field label="Restricciones">
            <Textarea rows={2} value={input.restricciones} onChange={(e) => setField("restricciones", e.target.value)} className="resize-y" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Banco">
              <Input value={input.bankName} onChange={(e) => setField("bankName", e.target.value)} />
            </Field>
            <Field label="CLABE interbancaria">
              <Input value={input.clabe} onChange={(e) => setField("clabe", e.target.value)} />
            </Field>
            <Field label="No. de cuenta">
              <Input value={input.accountNumber} onChange={(e) => setField("accountNumber", e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Elaboró">
              <Input value={input.elaboro} onChange={(e) => setField("elaboro", e.target.value)} />
            </Field>
            <Field label="Aprobó">
              <Input value={input.aprobo} onChange={(e) => setField("aprobo", e.target.value)} />
            </Field>
          </div>
      </FormSection>

      {/* ── Resumen calculado + acciones ── */}
      <FormSection icon={Sigma} title="Resumen" description="Se calcula solo con lo capturado arriba." className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Summary label="Total valor en aduana (MXN)" value={`$${formatMxn(computed.totalPesos)}`} />
            <Summary label="Total IGI" value={`$${formatMxn(computed.totalIgi)}`} />
            <Summary label="IVA" value={`$${formatMxn(computed.iva)}`} />
            <Summary label="TOTAL A DEPOSITAR" value={`$${formatMxn(computed.totalADepositar)}`} highlight />
      </FormSection>

      <ActionBar sticky>
            <Button variant="outline" onClick={handleGeneratePdf} disabled={isGenerating}>
              {isGenerating ? "Generando…" : "Generar PDF"}
            </Button>
            {mode === "new" && (
              <Button variant="outline" onClick={() => handleSave(true)} disabled={isSaving}>
                Guardar borrador
              </Button>
            )}
            <Button onClick={() => handleSave()} disabled={isSaving}>
              {isSaving ? "Guardando…" : mode === "new" ? "Crear cotización" : "Guardar cambios"}
            </Button>
      </ActionBar>
    </div>
  );
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {help && <p className="text-muted-foreground text-xs">{help}</p>}
    </div>
  );
}

function Money({
  label,
  value,
  onChange,
  step = "0.01",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        inputMode="decimal"
        step={step}
        value={value === 0 ? "" : value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </Field>
  );
}

function Summary({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={highlight ? "text-lg font-bold text-primary" : "font-semibold"}>{value}</p>
    </div>
  );
}
