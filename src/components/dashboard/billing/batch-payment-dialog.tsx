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
import { BILLING_KIND_LABELS, SAT_PAYMENT_FORMS, bankAmountFor, r2 } from "@/lib/billing";
import { folioLabel, money, todayKey, type BankAccountRow, type BillingDocument } from "./billing-shared";
import { DatePicker } from "@/components/ui/date-picker";

/**
 * Una sola transferencia que paga varias facturas del mismo cliente o
 * proveedor. En el banco queda un movimiento por la suma, como en su estado
 * de cuenta.
 */
export function BatchPaymentDialog({
  docs,
  accounts,
  onClose,
  onSaved,
}: {
  docs: BillingDocument[] | null;
  accounts: BankAccountRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={docs !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        {docs && docs.length > 0 && <BatchForm docs={docs} accounts={accounts} onClose={onClose} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  );
}

function BatchForm({ docs, accounts, onClose, onSaved }: { docs: BillingDocument[]; accounts: BankAccountRow[]; onClose: () => void; onSaved: () => void }) {
  const [first] = docs;
  const labels = BILLING_KIND_LABELS[first.kind];
  const currency = first.currency;
  const active = accounts.filter((a) => a.active);
  const [amounts, setAmounts] = useState<Record<string, string>>(() => Object.fromEntries(docs.map((d) => [d.id, formatMxn(d.balance)])));
  const [paidOn, setPaidOn] = useState(todayKey());
  const [accountId, setAccountId] = useState(active.find((a) => a.currency === currency)?.id ?? active[0]?.id ?? "");
  const [rate, setRate] = useState("");
  const [paymentForm, setPaymentForm] = useState("03");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const container = useRef<HTMLDivElement | null>(null);

  const account = active.find((a) => a.id === accountId) ?? null;
  const needsRate = account !== null && account.currency !== currency;
  const parsed = docs.map((d) => parseMxn(amounts[d.id] ?? "") ?? 0);
  const total = r2(parsed.reduce((s, n) => s + n, 0));
  const bankTotal = account && (!needsRate || Number(rate) > 0) ? bankAmountFor(total, currency, account.currency, needsRate ? Number(rate) : 1) : null;

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch("/api/billing/payments/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paidOn,
          bankAccountId: accountId,
          exchangeRate: rate,
          paymentForm,
          reference,
          items: docs.map((d, i) => ({ documentId: d.id, amount: parsed[i] })),
        }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "No se pudo guardar.");
      toast.success(`${labels.payment} de ${docs.length} facturas registrado.`);
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
        <DialogTitle>
          Registrar {labels.payment.toLowerCase()} de {docs.length} facturas
        </DialogTitle>
        <DialogDescription>
          {first.partyName}: una sola transferencia. En el banco queda un movimiento por el total.
        </DialogDescription>
      </DialogHeader>
      {active.length === 0 ? (
        <p className="text-muted-foreground text-sm">Primero da de alta una cuenta de banco en Administración → Bancos.</p>
      ) : (
        <div className="max-h-[65vh] space-y-4 overflow-y-auto px-1" ref={container}>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="px-3 py-2 text-left font-medium">Factura</th>
                  <th className="px-3 py-2 text-right font-medium">Saldo</th>
                  <th className="px-3 py-2 text-right font-medium">Monto ({currency})</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{folioLabel(d)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(d.balance, currency)}</td>
                    <td className="px-3 py-1.5">
                      <Input
                        inputMode="decimal"
                        aria-label={`Monto para ${folioLabel(d)}`}
                        value={amounts[d.id] ?? ""}
                        onChange={(e) => setAmounts((prev) => ({ ...prev, [d.id]: formatMxnLive(e.target.value) }))}
                        className="ml-auto h-8 w-36 text-right"
                      />
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/30">
                  <td className="px-3 py-2 font-medium" colSpan={2}>Total de la transferencia</td>
                  <td className="px-3 py-2 text-right font-bold tabular-nums">{money(total, currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="batch-date">Fecha</Label>
              <DatePicker id="batch-date" max={todayKey()} value={paidOn} onChange={(v) => setPaidOn(v)} />
            </div>
            <div className="space-y-2">
              <Label>{first.kind === "receivable" ? "Cuenta donde entró" : "Cuenta de donde salió"}</Label>
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
                <Label htmlFor="batch-rate">Tipo de cambio (pesos por dólar)</Label>
                <Input id="batch-rate" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ""))} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Forma de pago</Label>
              <AppSelect value={paymentForm} onValueChange={(v) => setPaymentForm(v || "03")} options={SAT_PAYMENT_FORMS} container={container} className="w-full" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="batch-ref">Referencia</Label>
              <Input id="batch-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
              <p className="text-muted-foreground text-xs">Número de operación o rastreo de la transferencia.</p>
            </div>
          </div>
          {bankTotal !== null && account && (
            <p className="text-muted-foreground text-xs">
              {first.kind === "receivable" ? "Entra a" : "Sale de"} {account.name}: <b>{money(bankTotal, account.currency)}</b> en un solo movimiento.
            </p>
          )}
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={submit} disabled={busy || active.length === 0 || !accountId || total <= 0}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          Guardar {labels.payment.toLowerCase()}
        </Button>
      </DialogFooter>
    </>
  );
}
