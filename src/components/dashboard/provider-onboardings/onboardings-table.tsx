"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, ChevronDown, Circle, Loader2, Minus, PauseCircle, Pencil, PlayCircle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { AppSelect } from "@/components/ui/app-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";
import {
  CONTRACT_STATUSES,
  DOC_STATUSES,
  ONBOARDING_DOCS,
  STAGE_LABELS,
  docProgress,
  onboardingStage,
  type ContractStatus,
  type DocKey,
  type DocRecord,
  type DocStatus,
  type OnboardingStage,
} from "@/lib/provider-onboardings";

export interface OnboardingRow {
  id: string;
  legalName: string;
  commercialName: string;
  prospectId: string | null;
  startedOn: string;
  docs: DocRecord;
  completedOn: string | null;
  altaAuthorizedBy: string | null;
  contractStatus: ContractStatus;
  legalRequestedOn: string | null;
  legalReceivedOn: string | null;
  sentToProviderOn: string | null;
  signedReceivedOn: string | null;
  contractAuthorizedBy: string | null;
  notes: string | null;
  purchasingNotes: string | null;
  onHoldSince: string | null;
  holdReason: string | null;
}

const CONTRACT_BY_VALUE = Object.fromEntries(CONTRACT_STATUSES.map((c) => [c.value, c]));

const STAGE_TONE: Record<OnboardingStage, string> = {
  in_progress: "bg-blue-100 text-blue-800",
  complete: "bg-green-100 text-green-800",
  on_hold: "bg-purple-100 text-purple-900",
};

const DOC_TONE: Record<DocStatus, string> = {
  pending: "border-dashed text-muted-foreground",
  received: "border-green-600 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200",
  not_applicable: "border-muted bg-muted text-muted-foreground",
};

function shortDate(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

/** Una pastilla por documento: clic para rotar pendiente → recibido → no aplica. */
function DocChip({
  docKey,
  status,
  canEdit,
  onChange,
}: {
  docKey: DocKey;
  status: DocStatus;
  canEdit: boolean;
  onChange: (next: DocStatus) => void;
}) {
  const doc = ONBOARDING_DOCS.find((d) => d.key === docKey)!;
  const next = (): DocStatus =>
    status === "pending" ? "received" : status === "received" ? "not_applicable" : "pending";
  const label = `${doc.label}: ${DOC_STATUSES.find((d) => d.value === status)!.label}`;
  return (
    <button
      type="button"
      disabled={!canEdit}
      onClick={() => onChange(next())}
      title={canEdit ? `${label}. Clic para cambiar.` : label}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium leading-none transition-colors",
        DOC_TONE[status],
        canEdit && "hover:ring-2 hover:ring-ring/40"
      )}
    >
      {/* La X del Excel es una palomita; N/A, una raya; pendiente, un círculo vacío. */}
      {status === "received" ? (
        <Check className="size-3 stroke-[3]" aria-hidden />
      ) : status === "not_applicable" ? (
        <Minus className="size-3" aria-hidden />
      ) : (
        <Circle className="size-2.5" aria-hidden />
      )}
      {doc.short}
    </button>
  );
}

/**
 * Alta de proveedores: el expediente y el contrato de cada transportista.
 * Lo del día a día (marcar un documento, mover el contrato, detener) se hace
 * aquí mismo; la ficha completa se abre con el lápiz.
 */
export function OnboardingsTable({
  editBase,
  canEdit = false,
  canDelete = false,
}: {
  editBase: string;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const [rows, setRows] = useState<OnboardingRow[] | null>(null);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<OnboardingStage | "all">("all");
  const [contract, setContract] = useState<ContractStatus | "all">("all");
  const [holding, setHolding] = useState<OnboardingRow | null>(null);
  const [holdReason, setHoldReason] = useState("");
  const [deleting, setDeleting] = useState<OnboardingRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/provider-onboardings")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: OnboardingRow[]) => setRows(d))
      .catch(() => setRows([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c: Record<OnboardingStage, number> = { in_progress: 0, complete: 0, on_hold: 0 };
    for (const r of rows ?? []) c[onboardingStage(r)]++;
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (stage !== "all" && onboardingStage(r) !== stage) return false;
      if (contract !== "all" && r.contractStatus !== contract) return false;
      if (!q) return true;
      return [r.legalName, r.commercialName, r.altaAuthorizedBy, r.contractAuthorizedBy, r.notes, r.purchasingNotes]
        .some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [rows, search, stage, contract]);

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/provider-onboardings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; completedOn?: string | null; onHoldSince?: string | null };
    if (!res.ok) throw new Error(data.error ?? "No se pudo guardar.");
    return data;
  }

  /** Cambio optimista con vuelta atrás si el servidor lo rechaza. */
  async function quick(row: OnboardingRow, local: Partial<OnboardingRow>, body: Record<string, unknown>, okMsg: string) {
    const prev = rows;
    setRows((list) => list?.map((x) => (x.id === row.id ? { ...x, ...local } : x)) ?? list);
    try {
      const data = await patch(row.id, body);
      setRows((list) =>
        list?.map((x) =>
          x.id === row.id
            ? { ...x, completedOn: data.completedOn ?? x.completedOn, onHoldSince: data.onHoldSince ?? null }
            : x
        ) ?? list
      );
      toast.success(okMsg);
    } catch (e) {
      setRows(prev ?? null);
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    }
  }

  function setDoc(row: OnboardingRow, key: DocKey, status: DocStatus) {
    const docs = { ...row.docs, [key]: status };
    void quick(row, { docs }, { docs: { [key]: status } }, "Expediente actualizado.");
  }

  function setContractStatus(row: OnboardingRow, status: ContractStatus) {
    if (status === row.contractStatus) return;
    void quick(row, { contractStatus: status }, { contractStatus: status }, "Contrato actualizado.");
  }

  async function confirmHold() {
    if (!holding) return;
    setBusy(true);
    try {
      await patch(holding.id, { onHold: true, holdReason: holdReason.trim() });
      toast.success("Alta detenida.");
      setHolding(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo detener.");
    } finally {
      setBusy(false);
    }
  }

  function resume(row: OnboardingRow) {
    void quick(row, { onHoldSince: null, holdReason: null }, { onHold: false }, "Alta reactivada.");
  }

  async function remove(row: OnboardingRow) {
    setBusy(true);
    try {
      const res = await fetch(`/api/provider-onboardings/${row.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRows((list) => list?.filter((x) => x.id !== row.id) ?? list);
      toast.success("Alta eliminada.");
    } catch {
      toast.error("No se pudo eliminar.");
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  }

  if (rows === null) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const stageOptions = [
    { value: "all", label: `Todos (${rows.length})` },
    ...(["in_progress", "complete", "on_hold"] as OnboardingStage[]).map((s) => ({ value: s, label: `${STAGE_LABELS[s]} (${counts[s]})` })),
  ];

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:max-w-xs" aria-label="Buscar proveedor" />
        <AppSelect value={stage} onValueChange={(v) => setStage((v || "all") as OnboardingStage | "all")} options={stageOptions} className="w-full sm:w-44" />
        <AppSelect
          value={contract}
          onValueChange={(v) => setContract((v || "all") as ContractStatus | "all")}
          options={[{ value: "all", label: "Todos los contratos" }, ...CONTRACT_STATUSES.map((c) => ({ value: c.value, label: c.label }))]}
          className="w-full sm:w-72"
        />
      </div>

      {visible.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          {rows.length === 0 ? "Todavía no hay altas registradas." : "Ninguna alta coincide con los filtros."}
        </p>
      ) : (
        <div className="@container/table w-full overflow-x-auto rounded-md border">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="bg-muted/40 border-b">
                <th className="px-4 py-2 text-left font-medium">Proveedor</th>
                <th className="hidden px-4 py-2 text-left font-medium @3xl/table:table-cell">Inicio</th>
                <th className="px-4 py-2 text-left font-medium">Expediente</th>
                <th className="px-4 py-2 text-left font-medium">Alta</th>
                <th className="px-4 py-2 text-left font-medium">Contrato</th>
                <th className="hidden px-4 py-2 text-left font-medium @5xl/table:table-cell">Autoriza</th>
                {(canEdit || canDelete) && <th className="w-24 px-2 py-2" />}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const st = onboardingStage(r);
                const progress = docProgress(r.docs);
                const c = CONTRACT_BY_VALUE[r.contractStatus];
                return (
                  <tr key={r.id} className={cn("border-b align-top last:border-0", st === "on_hold" && "bg-purple-50/60 dark:bg-purple-950/20")}>
                    <td className="px-4 py-3">
                      <span className="block max-w-64 truncate font-medium" title={r.legalName}>{r.legalName}</span>
                      <span className="text-muted-foreground block max-w-64 truncate text-xs" title={r.commercialName}>{r.commercialName}</span>
                      {st === "on_hold" && r.holdReason && (
                        <span className="mt-1 block max-w-64 text-xs text-purple-900 dark:text-purple-200" title={r.holdReason}>{r.holdReason}</span>
                      )}
                    </td>
                    <td className="text-muted-foreground hidden whitespace-nowrap px-4 py-3 @3xl/table:table-cell">{shortDate(r.startedOn)}</td>
                    <td className="px-4 py-3">
                      <div className="flex max-w-72 flex-wrap gap-1">
                        {ONBOARDING_DOCS.map((d) => (
                          <DocChip key={d.key} docKey={d.key} status={r.docs[d.key]} canEdit={canEdit} onChange={(next) => setDoc(r, d.key, next)} />
                        ))}
                      </div>
                      <span className="text-muted-foreground mt-1 block text-xs">{progress.done} de {progress.total}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn("border-0 whitespace-nowrap", STAGE_TONE[st])}>{STAGE_LABELS[st]}</Badge>
                      {r.completedOn && <span className="text-muted-foreground mt-1 block text-xs">{shortDate(r.completedOn)}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {canEdit ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex max-w-56 items-center gap-1 rounded-full text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <Badge variant="outline" className={cn("border-0 whitespace-normal", c.badgeClass)}>{c.label}</Badge>
                            <ChevronDown className="text-muted-foreground size-3 shrink-0" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {CONTRACT_STATUSES.map((s) => (
                              <DropdownMenuItem key={s.value} onClick={() => setContractStatus(r, s.value)}>{s.label}</DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Badge variant="outline" className={cn("border-0 whitespace-normal", c.badgeClass)}>{c.label}</Badge>
                      )}
                      {r.signedReceivedOn && <span className="text-muted-foreground mt-1 block text-xs">Firmado {shortDate(r.signedReceivedOn)}</span>}
                    </td>
                    <td className="text-muted-foreground hidden px-4 py-3 text-xs @5xl/table:table-cell">
                      {r.altaAuthorizedBy && <span className="block">Alta: {r.altaAuthorizedBy}</span>}
                      {r.contractAuthorizedBy && <span className="block">Contrato: {r.contractAuthorizedBy}</span>}
                      {!r.altaAuthorizedBy && !r.contractAuthorizedBy && "—"}
                    </td>
                    {(canEdit || canDelete) && (
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            st === "on_hold" ? (
                              <Button variant="ghost" size="icon" className="size-7" aria-label="Reactivar alta" title="Reactivar" onClick={() => resume(r)}>
                                <PlayCircle className="size-3.5 text-green-700" />
                              </Button>
                            ) : (
                              <Button variant="ghost" size="icon" className="size-7" aria-label="Detener alta" title="Detener" onClick={() => { setHoldReason(""); setHolding(r); }}>
                                <PauseCircle className="size-3.5 text-purple-700" />
                              </Button>
                            )
                          )}
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="size-7" asChild>
                              <Link href={`${editBase}/${r.id}/edit`} aria-label={`Editar ${r.legalName}`}><Pencil className="size-3.5" /></Link>
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" className="size-7" aria-label={`Eliminar ${r.legalName}`} onClick={() => setDeleting(r)}>
                              <Trash2 className="text-destructive size-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        Expediente: clic en cada documento para marcarlo recibido, no aplica o pendiente. El alta queda
        completa sola cuando no hay pendientes.
      </p>

      <Dialog open={holding !== null} onOpenChange={(open) => !open && setHolding(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detener el alta de {holding?.commercialName}</DialogTitle>
            <DialogDescription>Queda resaltada y fuera de las que están en proceso. Se puede reactivar cuando quieras.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="hold-reason">Por qué se detiene</Label>
            <Textarea id="hold-reason" rows={3} value={holdReason} onChange={(e) => setHoldReason(e.target.value)} />
            <p className="text-muted-foreground text-xs">Ya no contesta, no tiene seguro, se negó a la visita, documentos en duda…</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHolding(null)}>Cancelar</Button>
            <Button onClick={confirmHold} disabled={busy || holdReason.trim().length < 3}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Detener
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar el alta de {deleting?.commercialName}?</AlertDialogTitle>
            <AlertDialogDescription>Se borra el seguimiento del expediente y del contrato. No se puede deshacer. Si solo se detuvo, mejor detenla con su motivo.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && remove(deleting)}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
