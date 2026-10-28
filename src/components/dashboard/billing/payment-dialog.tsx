"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatMxn, formatMxnLive, parseMxn } from "@/lib/utils";
import { BILLING_KIND_LABELS, SAT_PAYMENT_FORMS, bankAmountFor } from "@/lib/billing";
import { folioLabel, money, todayKey, type BankAccountRow, type BillingDocument } from "./billing-shared";
import { DatePicker } from "@/components/ui/date-picker";

/**
 * Registrar un cobro (factura a cliente) o un pago (factura de proveedor).
 * El movimiento de banco se crea solo con el monto en la moneda de la cuenta.
 */
export function PaymentDialog({
  doc,
  accounts,
  onClose,
  onSaved,
}: {
  doc: BillingDocument | null;
  accounts: BankAccountRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={doc !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {doc && <PaymentForm doc={doc} accounts={accounts} onClose={onClose} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  );
}

function PaymentForm({
  doc,
  accounts,
  onClose,
  onSaved,
}: {
  doc: BillingDocument;
  accounts: BankAccountRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const labels = BILLING_KIND_LABELS[doc.kind];
  const active = accounts.filter((a) => a.active);
  const sameCurrency = active.find((a) => a.currency === doc.currency);
  const [paidOn, setPaidOn] = useState(todayKey());
  const [amount, setAmount] = useState(formatMxn(doc.balance));
  const [accountId, setAccountId] = useState(sameCurrency?.id ?? active[0]?.id ?? "");
  const [rate, setRate] = useState(doc.currency === "USD" ? String(doc.exchangeRate) : "");
  const [paymentForm, setPaymentForm] = useState("03");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const container = useRef<HTMLDivElement | null>(null);

  const account = active.find((a) => a.id === accountId) ?? null;
  const needsRate = account !== null && account.currency !== doc.currency;
  const parsedAmount = parseMxn(amount);
  const parsedRate = Number(rate);
  const preview =
    !account || parsedAmount === undefined || (needsRate && !(parsedRate > 0))
      ? null
      : bankAmountFor(parsedAmount, doc.currency, account.currency, needsRate ? parsedRate : 1);

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch(`/api/billing/documents/${doc.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paidOn, amount, bankAccountId: accountId, exchangeRate: rate, paymentForm, reference }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "No se pudo guardar.");
      }
      toast.success(`${labels.payment} registrado.`);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Registrar {labels.payment.toLowerCase()}</DialogTitle>
        <DialogDescription>
          Factura {folioLabel(doc)} · {doc.partyName}. Saldo pendiente: {money(doc.balance, doc.currency)}.
        </DialogDescription>
      </DialogHeader>
      {active.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Primero da de alta una cuenta de banco en Administración → Bancos.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2" ref={container}>
          <div className="space-y-2">
            <Label htmlFor="pay-date">Fecha</Label>
            <DatePicker id="pay-date" max={todayKey()} value={paidOn} onChange={(v) => setPaidOn(v)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pay-amount">Monto ({doc.currency})</Label>
            <Input id="pay-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(formatMxnLive(e.target.value))} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{doc.kind === "receivable" ? "Cuenta donde entró" : "Cuenta de donde salió"}</Label>
            <AppSelect
              value={accountId}
              onValueChange={setAccountId}
              options={active.map((a) => ({ value: a.id, label: `${a.name} · ${a.currency}` }))}
              container={container}
              className="w-full"
            />
          </div>
          {needsRate && (
            <div className="space-y-2">
              <Label htmlFor="pay-rate">Tipo de cambio (pesos por dólar)</Label>
              <Input id="pay-rate" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ""))} />
            </div>
          )}
          <div className="space-y-2">
            <Label>Forma de pago</Label>
            <AppSelect value={paymentForm} onValueChange={(v) => setPaymentForm(v || "03")} options={SAT_PAYMENT_FORMS} container={container} className="w-full" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pay-ref">Referencia</Label>
            <Input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
            <p className="text-muted-foreground text-xs">Número de operación o rastreo de la transferencia.</p>
          </div>
          {preview !== null && account && (
            <p className="text-muted-foreground text-xs sm:col-span-2">
              {doc.kind === "receivable" ? "Entra a" : "Sale de"} {account.name}: <b>{money(preview, account.currency)}</b>
            </p>
          )}
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={submit} disabled={busy || active.length === 0 || !accountId}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          Guardar {labels.payment.toLowerCase()}
        </Button>
      </DialogFooter>
    </>
  );
}
