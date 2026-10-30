"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, FileUp, Landmark, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ResourceDetailSkeleton } from "@/components/ui/skeletons";
import { AppSelect } from "@/components/ui/app-select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn, formatMxnLive } from "@/lib/utils";
import type { Currency } from "@/lib/billing";
import { KIND_SLUG, money, shortDay, todayKey, type BankAccountRow } from "./billing-shared";
import { StatementImportDialog } from "./statement-import-dialog";
import { ExportableTable } from "@/components/dashboard/export/exportable-table";
import { DatePicker } from "@/components/ui/date-picker";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useConfirm } from "@/components/ui/confirm-provider";

/** Cuentas de banco con su saldo y movimientos sin conciliar. */
export function BanksView({ basePath, canCreate }: { basePath: string; canCreate: boolean }) {
  const [accounts, setAccounts] = useState<BankAccountRow[] | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    fetch("/api/billing/banks")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setAccounts(Array.isArray(d) ? d : []))
      .catch(() => setAccounts([]));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  if (accounts === null) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  const totals = accounts
    .filter((a) => a.active)
    .reduce((acc, a) => ({ ...acc, [a.currency]: (acc[a.currency] ?? 0) + a.balance }), {} as Record<Currency, number>);

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          Saldo total: <b className="tabular-nums">{money(totals.MXN ?? 0, "MXN")}</b>
          {totals.USD !== undefined && (
            <>
              {" "}· <b className="tabular-nums">{money(totals.USD, "USD")}</b>
            </>
          )}
        </p>
        {canCreate && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            Nueva cuenta
          </Button>
        )}
      </div>

      {accounts.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          Todavía no hay cuentas de banco. Da de alta cada cuenta con su saldo al día en que empiezan a usar la plataforma.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => (
            <Link key={a.id} href={`${basePath}/${a.id}`} className={cn("block", !a.active && "opacity-60")}>
              <Card className="hover:bg-muted/40 h-full py-0 transition-colors">
                <CardContent className="space-y-1 p-4">
                  <div className="flex items-center gap-2">
                    <Landmark className="text-primary size-4" />
                    <span className="font-semibold">{a.name}</span>
                    {!a.active && <span className="text-muted-foreground text-xs">(inactiva)</span>}
                  </div>
                  <p className="text-muted-foreground text-xs">{[a.bank, a.accountNumber && `· ${a.accountNumber}`].filter(Boolean).join(" ")}</p>
                  <p className={cn("text-2xl font-bold tabular-nums", a.balance < 0 && "text-destructive")}>{money(a.balance, a.currency)}</p>
                  <p className="text-muted-foreground text-xs">
                    {a.unreconciled > 0 ? `${a.unreconciled} movimiento${a.unreconciled === 1 ? "" : "s"} sin conciliar` : "Todo conciliado"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <AccountDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={() => {
          setCreating(false);
          load();
        }}
      />
    </div>
  );
}

function AccountDialog({
  open,
  account,
  onClose,
  onSaved,
}: {
  open: boolean;
  account?: { id: string; name: string; bank: string | null; accountNumber: string | null; currency: Currency; initialBalance: number; initialBalanceOn: string; active: boolean };
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">{open && <AccountForm account={account} onClose={onClose} onSaved={onSaved} />}</DialogContent>
    </Dialog>
  );
}

function AccountForm({
  account,
  onClose,
  onSaved,
}: {
  account?: Parameters<typeof AccountDialog>[0]["account"];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(account?.name ?? "");
  const [bank, setBank] = useState(account?.bank ?? "");
  const [accountNumber, setAccountNumber] = useState(account?.accountNumber ?? "");
  const [currency, setCurrency] = useState<Currency>(account?.currency ?? "MXN");
  const [initialBalance, setInitialBalance] = useState(account ? String(account.initialBalance) : "");
  const [initialBalanceOn, setInitialBalanceOn] = useState(account?.initialBalanceOn ?? todayKey());
  const [active, setActive] = useState(account?.active ?? true);
  const [busy, setBusy] = useState(false);
  const container = useRef<HTMLDivElement | null>(null);

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch(account ? `/api/billing/banks/${account.id}` : "/api/billing/banks", {
        method: account ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bank, accountNumber, currency, initialBalance: initialBalance || "0", initialBalanceOn, active }),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudo guardar.");
      toast.success(account ? "Cuenta actualizada." : "Cuenta creada.");
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
        <DialogTitle>{account ? "Editar cuenta" : "Nueva cuenta de banco"}</DialogTitle>
        <DialogDescription>El saldo inicial es el del estado de cuenta el día en que empiezan a registrar movimientos aquí.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2" ref={container}>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="acc-name">Nombre</Label>
          <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} />
          <p className="text-muted-foreground text-xs">Como la conocen: «BBVA operación», «Santander dólares»…</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="acc-bank">Banco</Label>
          <Input id="acc-bank" value={bank} onChange={(e) => setBank(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="acc-number">Últimos dígitos o CLABE</Label>
          <Input id="acc-number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
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
        <div className="space-y-2">
          <Label htmlFor="acc-initial">Saldo inicial</Label>
          <Input id="acc-initial" inputMode="decimal" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value.replace(/[^\d.-]/g, ""))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="acc-initial-on">Al día</Label>
          <DatePicker id="acc-initial-on" value={initialBalanceOn} onChange={(v) => setInitialBalanceOn(v)} />
        </div>
        {account && (
          <div className="flex items-center gap-3 sm:col-span-2">
            <Switch id="acc-active" checked={active} onCheckedChange={(v) => setActive(Boolean(v))} />
            <Label htmlFor="acc-active">Cuenta activa</Label>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit} disabled={busy || !name.trim()}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          Guardar
        </Button>
      </DialogFooter>
    </>
  );
}

interface Movement {
  id: string;
  date: string;
  amount: number;
  concept: string;
  reference: string | null;
  reconciled: boolean;
  balance: number;
  source: "cobro" | "pago" | "gasto" | "manual";
  documentId: string | null;
  documentKind: "receivable" | "payable" | null;
  batchDocuments: { id: string; kind: "receivable" | "payable"; folio: string }[];
  createdByName: string | null;
}

interface AccountDetail {
  id: string;
  name: string;
  bank: string | null;
  accountNumber: string | null;
  currency: Currency;
  initialBalance: number;
  initialBalanceOn: string;
  active: boolean;
  balance: number;
  movements: Movement[];
  /** Desde cuándo se muestran los movimientos (null = todo el historial). */
  since: string | null;
  olderUnreconciled: number;
}

/** Movimientos de una cuenta con saldo corrido y conciliación contra el estado de cuenta. */
export function BankDetailView({
  basePath,
  billingBase,
  canCreate,
  canUpdate,
  canDelete,
}: {
  basePath: string;
  /** Raíz de Administración, para ligar los cobros y pagos a su factura. */
  billingBase: string;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AccountDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [onlyPending, setOnlyPending] = useState(false);
  const [fullHistory, setFullHistory] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const confirm = useConfirm();

  const load = useCallback(() => {
    fetch(`/api/billing/banks/${id}${fullHistory ? "?history=all" : ""}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("No se pudo cargar la cuenta.");
        return r.json();
      })
      .then((d: AccountDetail) => setData(d))
      .catch((e: Error) => setError(e.message));
  }, [id, fullHistory]);
  useEffect(() => {
    load();
  }, [load]);

  async function toggle(m: Movement) {
    setData((d) => d && { ...d, movements: d.movements.map((x) => (x.id === m.id ? { ...x, reconciled: !x.reconciled } : x)) });
    const res = await fetch(`/api/billing/movements/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reconciled: !m.reconciled }) });
    if (!res.ok) {
      toast.error("No se pudo actualizar.");
      load();
    }
  }

  async function remove(m: Movement) {
    if (
      !(await confirm({
        title: "¿Borrar el movimiento?",
        description: `Se borra "${m.concept}" del ${shortDay(m.date)} por ${money(m.amount, data?.currency ?? "MXN")} y el saldo de la cuenta se recalcula.`,
        confirmLabel: "Borrar",
        destructive: true,
      }))
    )
      return;
    const res = await fetch(`/api/billing/movements/${m.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudo borrar.");
      return;
    }
    toast.success("Movimiento borrado.");
    load();
  }

  async function removeAccount() {
    const res = await fetch(`/api/billing/banks/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudo borrar la cuenta.");
      return;
    }
    toast.success("Cuenta borrada.");
    router.push(basePath);
  }

  if (error) return <p className="text-destructive py-6 text-sm">{error}</p>;
  if (!data) return <ResourceDetailSkeleton />;
  const rows = onlyPending ? data.movements.filter((m) => !m.reconciled) : data.movements;

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href={basePath} aria-label="Volver a bancos">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="page-heading truncate">{data.name}</h1>
            <p className="text-muted-foreground text-sm">
              Saldo: <b className={cn("tabular-nums", data.balance < 0 && "text-destructive")}>{money(data.balance, data.currency)}</b>
              {" · "}Saldo inicial {money(data.initialBalance, data.currency)} al {shortDay(data.initialBalanceOn)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreate && (
            <Button onClick={() => setAdding(true)}>
              <Plus className="size-4" />
              Movimiento
            </Button>
          )}
          {canUpdate && (
            <Button variant="outline" onClick={() => setImporting(true)}>
              <FileUp className="size-4" />
              Importar estado de cuenta
            </Button>
          )}
          {canUpdate && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              Editar cuenta
            </Button>
          )}
          {canDelete && (
            <Button variant="destructive" onClick={() => setDeleting(true)}>
              <Trash2 className="size-4" />
              Eliminar cuenta
            </Button>
          )}
        </div>
        <DeleteConfirmDialog
          open={deleting}
          onOpenChange={setDeleting}
          title={`¿Eliminar la cuenta ${data.name}?`}
          description="Se borra con todo: sus movimientos y los cobros y pagos registrados con ella. Las facturas que se pagaron con esta cuenta vuelven a quedar con saldo pendiente. No se puede deshacer."
          onConfirm={removeAccount}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
          <CardTitle className="text-base">Movimientos</CardTitle>
          <div className="flex items-center gap-2">
            <Switch id="only-pending" checked={onlyPending} onCheckedChange={(v) => setOnlyPending(Boolean(v))} />
            <Label htmlFor="only-pending">Solo sin conciliar</Label>
          </div>
        </CardHeader>
        <CardContent>
          {data.since && (
            <p className="text-muted-foreground mb-3 text-xs">
              Se muestran los movimientos desde el {shortDay(data.since)}; lo anterior ya va sumado en el saldo.
              {data.olderUnreconciled > 0 && ` Hay ${data.olderUnreconciled} anterior${data.olderUnreconciled === 1 ? "" : "es"} sin conciliar.`}{" "}
              <button type="button" className="text-primary underline-offset-4 hover:underline" onClick={() => setFullHistory(true)}>
                Ver todo el historial
              </button>
            </p>
          )}
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {data.movements.length === 0 && data.since
                ? "Sin movimientos en los últimos meses."
                : data.movements.length === 0
                ? "Todavía no hay movimientos. Los cobros, pagos y gastos que usen esta cuenta aparecen aquí solos."
                : "Todos los movimientos están conciliados."}
            </p>
          ) : (
            <ExportableTable title={`Movimientos ${data.name}`}>
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-max text-sm md:min-w-0">
                  <thead>
                    <tr className="border-b">
                      <th className="w-10 py-2 pr-2 text-left font-medium" title="Conciliado contra el estado de cuenta">OK</th>
                      <th className="py-2 pr-4 text-left font-medium">Fecha</th>
                      <th className="py-2 pr-4 text-left font-medium">Concepto</th>
                      <th className="py-2 pr-4 text-right font-medium">Entra</th>
                      <th className="py-2 pr-4 text-right font-medium">Sale</th>
                      <th className="py-2 pr-4 text-right font-medium">Saldo</th>
                      {canDelete && <th className="w-10" />}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((m) => (
                      <tr key={m.id} className={cn("border-b last:border-0", m.reconciled && "text-muted-foreground")}>
                        <td className="py-2 pr-2">
                          <input
                            type="checkbox"
                            checked={m.reconciled}
                            disabled={!canUpdate}
                            onChange={() => toggle(m)}
                            className="accent-primary size-4"
                            aria-label={`Conciliado: ${m.concept}`}
                          />
                        </td>
                        <td className="py-2 pr-4 whitespace-nowrap">{shortDay(m.date)}</td>
                        <td className="py-2 pr-4">
                          {m.documentId && m.documentKind ? (
                            <Link href={`${billingBase}/${KIND_SLUG[m.documentKind]}/${m.documentId}`} className="text-primary hover:underline">
                              {m.concept}
                            </Link>
                          ) : (
                            m.concept
                          )}
                          {m.batchDocuments.length > 0 && (
                            <span className="block text-xs">
                              {m.batchDocuments.map((d, i) => (
                                <span key={d.id}>
                                  {i > 0 && " · "}
                                  <Link href={`${billingBase}/${KIND_SLUG[d.kind]}/${d.id}`} className="text-primary hover:underline">{d.folio}</Link>
                                </span>
                              ))}
                            </span>
                          )}
                          {m.reference && <span className="text-muted-foreground block text-xs">Ref. {m.reference}</span>}
                        </td>
                        <td className="py-2 pr-4 text-right whitespace-nowrap tabular-nums text-green-700">{m.amount > 0 ? money(m.amount, data.currency) : ""}</td>
                        <td className="text-destructive py-2 pr-4 text-right whitespace-nowrap tabular-nums">{m.amount < 0 ? money(-m.amount, data.currency) : ""}</td>
                        <td className="py-2 pr-4 text-right whitespace-nowrap tabular-nums">{money(m.balance, data.currency)}</td>
                        {canDelete && (
                          <td className="py-2">
                            {m.source === "manual" && (
                              <Button variant="ghost" size="icon" className="size-7" aria-label="Borrar movimiento" onClick={() => remove(m)}>
                                <Trash2 className="text-destructive size-3.5" />
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ExportableTable>
          )}
        </CardContent>
      </Card>

      <MovementDialog
        open={adding}
        accountId={data.id}
        currency={data.currency}
        onClose={() => setAdding(false)}
        onSaved={() => {
          setAdding(false);
          load();
        }}
      />
      <StatementImportDialog
        open={importing}
        accountId={data.id}
        currency={data.currency}
        canCreate={canCreate}
        onClose={() => setImporting(false)}
        onApplied={() => {
          setImporting(false);
          load();
        }}
      />
      <AccountDialog
        open={editing}
        account={data}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          load();
        }}
      />
    </div>
  );
}

function MovementDialog({
  open,
  accountId,
  currency,
  onClose,
  onSaved,
}: {
  open: boolean;
  accountId: string;
  currency: Currency;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">{open && <MovementForm accountId={accountId} currency={currency} onClose={onClose} onSaved={onSaved} />}</DialogContent>
    </Dialog>
  );
}

function MovementForm({ accountId, currency, onClose, onSaved }: { accountId: string; currency: Currency; onClose: () => void; onSaved: () => void }) {
  const [direction, setDirection] = useState<"in" | "out">("out");
  const [date, setDate] = useState(todayKey());
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const container = useRef<HTMLDivElement | null>(null);

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch(`/api/billing/banks/${accountId}/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction, date, amount, concept, reference }),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudo guardar.");
      toast.success("Movimiento registrado.");
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
        <DialogTitle>Nuevo movimiento</DialogTitle>
        <DialogDescription>Comisiones, intereses, traspasos o depósitos sin factura. Los cobros, pagos y gastos se registran desde su sección.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2" ref={container}>
        <div className="space-y-2">
          <Label>Tipo</Label>
          <AppSelect
            value={direction}
            onValueChange={(v) => setDirection(v === "in" ? "in" : "out")}
            options={[{ value: "out", label: "Sale de la cuenta" }, { value: "in", label: "Entra a la cuenta" }]}
            container={container}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mov-date">Fecha</Label>
          <DatePicker id="mov-date" value={date} onChange={(v) => setDate(v)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mov-amount">Monto ({currency})</Label>
          <Input id="mov-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(formatMxnLive(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mov-ref">Referencia</Label>
          <Input id="mov-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="mov-concept">Concepto</Label>
          <Input id="mov-concept" value={concept} onChange={(e) => setConcept(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit} disabled={busy || !amount || concept.trim().length < 3}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          Guardar
        </Button>
      </DialogFooter>
    </>
  );
}
