"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { pdf } from "@react-pdf/renderer";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
}

export function MaritimeQuoteForm({ mode, quoteId, backHref, initialInput }: Props) {
  const router = useRouter();
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

  function validate(): string | null {
    if (!input.reference.trim()) return "Falta la referencia.";
    if (!input.client.trim()) return "Falta el cliente.";
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

  async function handleSave() {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        reference: input.reference,
        client: input.client,
        validUntil: input.validUntil,
        data: input,
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
      toast.success(mode === "new" ? "Cotización creada" : "Cotización actualizada");
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
    <div className="space-y-6">
      {/* ── Datos generales ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Datos generales
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Referencia">
            <Input value={input.reference} onChange={(e) => setField("reference", e.target.value)} placeholder="202605-07" />
          </Field>
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
          <Field label="Fecha de factura">
            <Input value={input.invoiceDate} onChange={(e) => setField("invoiceDate", e.target.value)} placeholder="dd/mm/aaaa" />
          </Field>
          <Field label="Clientes (razón social)">
            <Input value={input.clientName} onChange={(e) => setField("clientName", e.target.value)} />
          </Field>
          <Field label="ETA">
            <Input value={input.eta} onChange={(e) => setField("eta", e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      {/* ── Fracciones ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Fracciones sugeridas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Input key={i} value={input.fractions[i] ?? ""} onChange={(e) => setFraction(i, e.target.value)} placeholder={`Fracción ${i + 1}`} />
          ))}
        </CardContent>
      </Card>

      {/* ── Valor en aduana ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Cálculo del valor en aduana (USD)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Money label="Valor Factura" value={input.invoiceValueUsd} onChange={(v) => setField("invoiceValueUsd", v)} />
          <Money label="Flete Internacional" value={input.internationalFreightUsd} onChange={(v) => setField("internationalFreightUsd", v)} />
          <Money label="Seguro" value={input.insuranceUsd} onChange={(v) => setField("insuranceUsd", v)} />
          <Money label="Otros" value={input.othersUsd} onChange={(v) => setField("othersUsd", v)} />
          <Money label="Tipo de Cambio" value={input.exchangeRate} onChange={(v) => setField("exchangeRate", v)} step="0.0001" />
          <Field label="Total Incrementables (auto)">
            <Input readOnly disabled value={`$${formatMxn(computed.totalIncrementables)}`} className="bg-muted" />
          </Field>
        </CardContent>
      </Card>

      {/* ── Valor en aduana por fracción (ADV) ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Valor en aduana por fracción (moneda extranjera) → IGI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
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
        </CardContent>
      </Card>

      {/* ── Gastos e impuestos ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Gastos e impuestos (captura manual)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
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
        </CardContent>
      </Card>

      {/* ── Pie del documento ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Restricciones y datos bancarios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      {/* ── Resumen calculado + acciones ── */}
      <Card className="border-primary/40">
        <CardContent className="space-y-3 py-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <Summary label="Total valor en aduana (MXN)" value={`$${formatMxn(computed.totalPesos)}`} />
            <Summary label="Total IGI" value={`$${formatMxn(computed.totalIgi)}`} />
            <Summary label="IVA" value={`$${formatMxn(computed.iva)}`} />
            <Summary label="TOTAL A DEPOSITAR" value={`$${formatMxn(computed.totalADepositar)}`} highlight />
          </div>
          <Separator />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={handleGeneratePdf} disabled={isGenerating}>
              {isGenerating ? "Generando…" : "Generar PDF"}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Guardando…" : mode === "new" ? "Crear cotización" : "Guardar cambios"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
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
        placeholder="0.00"
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
