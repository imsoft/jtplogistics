"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { AppSelect } from "@/components/ui/app-select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatMxn, formatMxnLive, parseMxn } from "@/lib/utils";
import { normalizeSearch } from "@/lib/search";
import { EXPENSE_CATEGORIES, r2, toMxn, type Currency } from "@/lib/billing";
import { money, shortDay, todayKey, useBankAccounts, type BankAccountRow } from "./billing-shared";

interface Expense {
  id: string;
  date: string;
  category: string;
  providerName: string | null;
  description: string;
  currency: Currency;
  exchangeRate: number;
  subtotal: number;
  iva: number;
  total: number;
  uuid: string | null;
  bankAccountId: string | null;
  bankAccountName: string | null;
  notes: string | null;
  createdByName: string | null;
}

/** Gastos de la empresa: si se pagan desde una cuenta, salen solos del banco. */
export function ExpensesView({ canCreate, canUpdate, canDelete }: { canCreate: boolean; canUpdate: boolean; canDelete: boolean }) {
  const [rows, setRows] = useState<Expense[] | null>(null);
  const [editing, setEditing] = useState<Expense | "new" | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(todayKey().slice(0, 7));
  const accounts = useBankAccounts();

  const load = useCallback(() => {
    fetch("/api/billing/expenses")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = normalizeSearch(search);
    return (rows ?? []).filter(
      (e) =>
        (!month || e.date.startsWith(month)) &&
        (!q || [e.category, e.providerName, e.description, e.uuid].some((v) => normalizeSearch(v ?? "").includes(q)))
    );
  }, [rows, search, month]);

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of visible) m.set(e.category, r2((m.get(e.category) ?? 0) + toMxn(e.total, e.currency, e.exchangeRate)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [visible]);
  const totalMxn = byCategory.reduce((s, [, v]) => s + v, 0);

  async function remove(e: Expense) {
    const res = await fetch(`/api/billing/expenses/${e.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("No se pudo borrar.");
    toast.success("Gasto borrado.");
    setDeleting(null);
    load();
  }

  if (rows === null) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="exp-month">Mes</Label>
            <Input id="exp-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto" />
          </div>
          <div className="w-full space-y-1.5 sm:w-72">
            <Label htmlFor="exp-search">Buscar</Label>
            <Input id="exp-search" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        {canCreate && (
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" />
            Nuevo gasto
          </Button>
        )}
      </div>

      <Card className="py-0">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Total del periodo (en pesos)</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{money(r2(totalMxn), "MXN")}</p>
          {byCategory.length > 0 && (
            <ul className="mt-2 grid gap-x-6 gap-y-0.5 text-xs sm:grid-cols-2 lg:grid-cols-3">
              {byCategory.map(([c, v]) => (
                <li key={c} className="flex justify-between gap-3">
                  <span className="text-muted-foreground truncate">{c}</span>
                  <span className="tabular-nums">{money(v, "MXN")}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {visible.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          {rows.length === 0 ? "Todavía no hay gastos registrados." : "No hay gastos en este periodo o con esa búsqueda."}
        </p>
      ) : (
        <div className="@container/table w-full overflow-x-auto rounded-md border">
          <table className="w-full min-w-max text-sm md:min-w-0">
            <thead>
              <tr className="bg-muted/40 border-b">
                <th className="px-4 py-2 text-left font-medium">Fecha</th>
                <th className="px-4 py-2 text-left font-medium">Categoría</th>
                <th className="px-4 py-2 text-left font-medium">Descripción</th>
                <th className="hidden px-4 py-2 text-left font-medium @3xl/table:table-cell">Cuenta</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
                {(canUpdate || canDelete) && <th className="w-16 px-2 py-2" />}
              </tr>
            </thead>
            <tbody>
              {visible.map((e) => (
                <tr key={e.id} className="border-b align-top last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap">{shortDay(e.date)}</td>
                  <td className="px-4 py-3">{e.category}</td>
                  <td className="px-4 py-3">
                    <span className="block max-w-72 truncate" title={e.description}>{e.description}</span>
                    {e.providerName && <span className="text-muted-foreground block text-xs">{e.providerName}</span>}
                  </td>
                  <td className="text-muted-foreground hidden px-4 py-3 @3xl/table:table-cell">{e.bankAccountName ?? "—"}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">{money(e.total, e.currency)}</td>
                  {(canUpdate || canDelete) && (
                    <td className="px-2 py-3">
                      <div className="flex gap-1">
                        {canUpdate && (
                          <Button variant="ghost" size="icon" className="size-7" aria-label="Editar gasto" onClick={() => setEditing(e)}>
                            <Pencil className="size-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="icon" className="size-7" aria-label="Borrar gasto" onClick={() => setDeleting(e)}>
                            <Trash2 className="text-destructive size-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          {editing !== null && (
            <ExpenseForm
              expense={editing === "new" ? null : editing}
              accounts={accounts ?? []}
              onClose={() => setEditing(null)}
              onSaved={() => {
                setEditing(null);
                load();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar este gasto?</AlertDialogTitle>
            <AlertDialogDescription>También se quita su salida de la cuenta de banco.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && remove(deleting)}>Borrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ExpenseForm({
  expense,
  accounts,
  onClose,
  onSaved,
}: {
  expense: Expense | null;
  accounts: BankAccountRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(expense?.date ?? todayKey());
  const [category, setCategory] = useState(expense?.category ?? "");
  const [providerName, setProviderName] = useState(expense?.providerName ?? "");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [currency, setCurrency] = useState<Currency>(expense?.currency ?? "MXN");
  const [exchangeRate, setExchangeRate] = useState(expense && expense.currency === "USD" ? String(expense.exchangeRate) : "");
  const [subtotal, setSubtotal] = useState(expense ? formatMxn(expense.subtotal) : "");
  const [iva, setIva] = useState(expense ? formatMxn(expense.iva) : "");
  const [uuid, setUuid] = useState(expense?.uuid ?? "");
  const [bankAccountId, setBankAccountId] = useState(expense?.bankAccountId ?? "");
  const [notes, setNotes] = useState(expense?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const container = useRef<HTMLDivElement | null>(null);
  const total = r2((parseMxn(subtotal) ?? 0) + (parseMxn(iva) ?? 0));

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch(expense ? `/api/billing/expenses/${expense.id}` : "/api/billing/expenses", {
        method: expense ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, category, providerName, description, currency, exchangeRate, subtotal, iva, uuid, bankAccountId: bankAccountId || null, notes }),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudo guardar.");
      toast.success(expense ? "Gasto actualizado." : "Gasto registrado.");
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
        <DialogTitle>{expense ? "Editar gasto" : "Nuevo gasto"}</DialogTitle>
        <DialogDescription>Si eliges la cuenta con la que se pagó, la salida queda registrada en el banco.</DialogDescription>
      </DialogHeader>
      <div className="grid max-h-[60vh] gap-4 overflow-y-auto sm:grid-cols-2" ref={container}>
        <div className="space-y-2">
          <Label htmlFor="exp-date">Fecha</Label>
          <Input id="exp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
        </div>
        <div className="space-y-2">
          <Label>Categoría</Label>
          <AppSelect value={category} onValueChange={setCategory} options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))} container={container} className="w-full" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="exp-desc">Descripción</Label>
          <Input id="exp-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="exp-provider">Proveedor</Label>
          <Input id="exp-provider" value={providerName} onChange={(e) => setProviderName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Moneda</Label>
          <AppSelect
            value={currency}
            onValueChange={(v) => setCurrency(v === "USD" ? "USD" : "MXN")}
            options={[{ value: "MXN", label: "Pesos (MXN)" }, { value: "USD", label: "Dólares (USD)" }]}
            container={container}
            className="w-full"
          />
        </div>
        {currency === "USD" && (
          <div className="space-y-2">
            <Label htmlFor="exp-rate">Tipo de cambio</Label>
            <Input id="exp-rate" inputMode="decimal" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value.replace(/[^\d.]/g, ""))} />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="exp-subtotal">Importe sin IVA</Label>
          <Input id="exp-subtotal" inputMode="decimal" value={subtotal} onChange={(e) => setSubtotal(formatMxnLive(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="exp-iva">IVA</Label>
          <Input id="exp-iva" inputMode="decimal" value={iva} onChange={(e) => setIva(formatMxnLive(e.target.value))} />
          <p className="text-muted-foreground text-xs">Déjalo vacío si no trae IVA. Total: {money(total, currency)}</p>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Se pagó desde</Label>
          <AppSelect
            value={bankAccountId}
            onValueChange={setBankAccountId}
            options={accounts.filter((a) => a.active || a.id === bankAccountId).map((a) => ({ value: a.id, label: `${a.name} · ${a.currency}` }))}
            container={container}
            className="w-full"
          />
          <p className="text-muted-foreground text-xs">Vacío si se pagó en efectivo o todavía no se paga.</p>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="exp-uuid">Folio fiscal (UUID)</Label>
          <Input id="exp-uuid" value={uuid} onChange={(e) => setUuid(e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="exp-notes">Notas</Label>
          <Textarea id="exp-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit} disabled={busy || !category || description.trim().length < 3 || !subtotal}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          Guardar
        </Button>
      </DialogFooter>
    </>
  );
}
