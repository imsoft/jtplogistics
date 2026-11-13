"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, Loader2, PenLine, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useConfirm } from "@/components/ui/confirm-provider";
import { cn, formatMxn, formatMxnLive, parseMxn } from "@/lib/utils";
import { normalizeSearch } from "@/lib/search";
import { providerMargin } from "@/lib/quote-providers";
import type { QuoteRow } from "@/types/carrier-quote.types";

interface QuoteProvider {
  id: string;
  carrierId: string | null;
  name: string;
  amount: number;
  routeIndex: number | null;
  createdByName: string | null;
}

interface CarrierOption {
  id: string;
  label: string;
  legalName: string | null;
}

const routeLabel = (r: QuoteRow) => `${r.origin} → ${r.destination}${r.unitLabel ? ` · ${r.unitLabel}` : ""}`;

/**
 * Con qué proveedores se cotizó: dados de alta (se buscan) o escritos a mano,
 * con lo que cobra cada uno. Sirve para saber con quién se está cotizando y
 * cuánto queda de margen contra el precio al cliente.
 */
export function QuoteProvidersCard({ quoteId, rows }: { quoteId: string; rows: QuoteRow[] }) {
  const confirm = useConfirm();
  const [list, setList] = useState<QuoteProvider[] | null>(null);
  const [adding, setAdding] = useState(false);
  const prices = useMemo(() => rows.map((r) => Number(r.cost) || 0), [rows]);

  const load = useCallback(() => {
    fetch(`/api/quote-providers?quoteId=${quoteId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d: QuoteProvider[]) => setList(d))
      .catch(() => setList([]));
  }, [quoteId]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(p: QuoteProvider) {
    const ok = await confirm({
      title: `¿Quitar a ${p.name}?`,
      description: "Deja de aparecer entre los proveedores con los que se cotizó.",
      confirmLabel: "Quitar",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/quote-providers/${p.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("No se pudo quitar.");
    setList((l) => l?.filter((x) => x.id !== p.id) ?? l);
    toast.success("Proveedor quitado.");
  }

  const best = list && list.length > 0 ? Math.min(...list.map((p) => p.amount)) : null;
  const showRoute = rows.length > 1;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base">Proveedores cotizados{list ? ` (${list.length})` : ""}</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="size-4" />
          Agregar
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {list === null ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : list.length === 0 ? (
          <p className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-sm">
            Todavía no se registra con qué proveedores se cotizó.
          </p>
        ) : (
          <>
            <div className="w-full overflow-x-auto rounded-md border">
              <table className="w-full text-xs font-medium tracking-wide">
                <thead>
                  <tr className="bg-primary/[0.07] border-b">
                    <th className="text-primary px-3 py-2.5 text-left text-xs font-semibold tracking-wide uppercase">Proveedor</th>
                    {showRoute && <th className="text-primary px-3 py-2.5 text-left text-xs font-semibold tracking-wide uppercase">Ruta</th>}
                    <th className="text-primary px-3 py-2.5 text-right text-xs font-semibold tracking-wide uppercase">Precio</th>
                    <th className="text-primary px-3 py-2.5 text-right text-xs font-semibold tracking-wide uppercase">Margen</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => {
                    const m = providerMargin(p.amount, p.routeIndex, prices);
                    return (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="px-3 py-2.5">
                          <span className="block">{p.name}</span>
                          <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
                            {p.carrierId ? (
                              <>
                                <BadgeCheck className="size-3 text-green-600" aria-hidden />
                                Dado de alta
                              </>
                            ) : (
                              <>
                                <PenLine className="size-3" aria-hidden />
                                Escrito a mano
                              </>
                            )}
                            {p.createdByName && ` · ${p.createdByName}`}
                          </span>
                        </td>
                        {showRoute && (
                          <td className="text-muted-foreground px-3 py-2.5">{p.routeIndex !== null && rows[p.routeIndex] ? routeLabel(rows[p.routeIndex]) : "Toda la cotización"}</td>
                        )}
                        <td className={cn("px-3 py-2.5 text-right whitespace-nowrap tabular-nums", p.amount === best && list.length > 1 && "font-bold text-green-700")}>
                          ${formatMxn(p.amount)}
                        </td>
                        <td className={cn("px-3 py-2.5 text-right whitespace-nowrap tabular-nums", m && m.margin < 0 && "text-destructive")}>
                          {m ? `$${formatMxn(m.margin)} · ${m.pct} %` : "—"}
                        </td>
                        <td className="px-1 py-1.5">
                          <Button variant="ghost" size="icon" className="size-7" aria-label={`Quitar a ${p.name}`} onClick={() => remove(p)}>
                            <Trash2 className="text-destructive size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground text-xs">
              El margen es contra el precio al cliente de su ruta.{list.length > 1 && " En verde, el proveedor más barato."}
            </p>
          </>
        )}
      </CardContent>

      <AddProviderDialog
        open={adding}
        quoteId={quoteId}
        rows={rows}
        onClose={() => setAdding(false)}
        onAdded={(p) => {
          setList((l) => [...(l ?? []), p].sort((a, b) => a.amount - b.amount));
          setAdding(false);
        }}
      />
    </Card>
  );
}

function AddProviderDialog({
  open,
  quoteId,
  rows,
  onClose,
  onAdded,
}: {
  open: boolean;
  quoteId: string;
  rows: QuoteRow[];
  onClose: () => void;
  onAdded: (p: QuoteProvider) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {open && <AddProviderForm quoteId={quoteId} rows={rows} onClose={onClose} onAdded={onAdded} />}
      </DialogContent>
    </Dialog>
  );
}

function AddProviderForm({
  quoteId,
  rows,
  onClose,
  onAdded,
}: {
  quoteId: string;
  rows: QuoteRow[];
  onClose: () => void;
  onAdded: (p: QuoteProvider) => void;
}) {
  const [mode, setMode] = useState<"registered" | "manual">("registered");
  const [carriers, setCarriers] = useState<CarrierOption[] | null>(null);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<CarrierOption | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [route, setRoute] = useState(rows.length === 1 ? "0" : "all");
  const [busy, setBusy] = useState(false);
  // Dentro del diálogo, la lista del selector se abre aquí (si no, no se deja elegir).
  const selectContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/quote-providers/carriers")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: CarrierOption[]) => setCarriers(d))
      .catch(() => setCarriers([]));
  }, []);

  const matches = useMemo(() => {
    const n = normalizeSearch(q);
    return (carriers ?? []).filter((c) => normalizeSearch(`${c.label} ${c.legalName ?? ""}`).includes(n)).slice(0, 50);
  }, [carriers, q]);

  const parsed = parseMxn(amount);
  const canSave = (mode === "registered" ? picked !== null : name.trim().length >= 2) && parsed !== undefined && parsed > 0;

  async function save() {
    if (!canSave) return;
    setBusy(true);
    try {
      const res = await fetch("/api/quote-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId,
          carrierId: mode === "registered" ? picked?.id : null,
          name: mode === "registered" ? picked?.label : name.trim(),
          amount: parsed,
          routeIndex: route === "all" ? null : Number(route),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "No se pudo agregar.");
      toast.success("Proveedor agregado.");
      onAdded(data as QuoteProvider);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo agregar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Agregar proveedor cotizado</DialogTitle>
        <DialogDescription>Con quién se cotizó y cuánto cobra.</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Tipo de proveedor">
        {(
          [
            ["registered", "Dado de alta"],
            ["manual", "Escribir a mano"],
          ] as const
        ).map(([value, label]) => (
          <Button key={value} type="button" role="tab" aria-selected={mode === value} variant={mode === value ? "secondary" : "outline"} size="sm" onClick={() => setMode(value)}>
            {label}
          </Button>
        ))}
      </div>

      {mode === "registered" ? (
        <div className="space-y-2">
          <Label htmlFor="qp-search">Proveedor</Label>
          {picked ? (
            <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
              <span className="flex items-center gap-1.5 font-medium">
                <BadgeCheck className="size-4 text-green-600" aria-hidden />
                {picked.label}
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPicked(null)}>
                Cambiar
              </Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" aria-hidden />
                <Input id="qp-search" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <p className="text-muted-foreground text-xs">Busca por nombre comercial o razón social.</p>
              <div className="max-h-48 divide-y overflow-y-auto rounded-md border">
                {carriers === null ? (
                  <div className="space-y-2 p-2">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                ) : matches.length === 0 ? (
                  <p className="text-muted-foreground p-3 text-center text-sm">
                    No está dado de alta.{" "}
                    <button type="button" className="text-primary underline" onClick={() => { setMode("manual"); setName(q); }}>
                      Escribirlo a mano
                    </button>
                  </p>
                ) : (
                  matches.map((c) => (
                    <button key={c.id} type="button" onClick={() => setPicked(c)} className="hover:bg-muted/60 block w-full px-3 py-2 text-left text-sm">
                      {c.label}
                      {c.legalName && c.legalName !== c.label && <span className="text-muted-foreground block text-xs">{c.legalName}</span>}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="qp-name">Nombre del transporte</Label>
          <Input id="qp-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
          <p className="text-muted-foreground text-xs">Para los que todavía no están dados de alta.</p>
        </div>
      )}

      <div className={cn("grid gap-3", rows.length > 1 && "sm:grid-cols-2")}>
        <div className="space-y-2">
          <Label htmlFor="qp-amount">Precio del proveedor</Label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">$</span>
            <Input id="qp-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(formatMxnLive(e.target.value))} />
          </div>
          <p className="text-muted-foreground text-xs">Lo que nos cobra, en pesos.</p>
        </div>
        {rows.length > 1 && (
          <div className="space-y-2" ref={selectContainer}>
            <Label>Ruta</Label>
            <AppSelect
              value={route}
              onValueChange={(v) => setRoute(v || "all")}
              options={[{ value: "all", label: "Toda la cotización" }, ...rows.map((r, i) => ({ value: String(i), label: routeLabel(r) }))]}
              className="w-full"
              container={selectContainer}
            />
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={save} disabled={busy || !canSave}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          Agregar
        </Button>
      </DialogFooter>
    </>
  );
}
