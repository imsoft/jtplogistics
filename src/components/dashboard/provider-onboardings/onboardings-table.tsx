"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, ChevronDown, Circle, ClipboardCheck, Loader2, Minus, PauseCircle, Pencil, PlayCircle, Trash2, UserRound } from "lucide-react";
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
import { providerProfileHref } from "@/lib/provider-onboarding-account";
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
  URGENCIES,
  urgencyRank,
  type Urgency,
} from "@/lib/provider-onboardings";
import { ExportableTable } from "@/components/dashboard/export/exportable-table";
import { ProviderSheet, isRowClick, type ProviderSheetTarget } from "@/components/dashboard/prospects/provider-sheet";

export interface OnboardingRow {
  id: string;
  legalName: string;
  commercialName: string;
  prospectId: string | null;
  email: string | null;
  rfc: string | null;
  /** La cuenta del proveedor, que nace sola al completar el alta. */
  userId: string | null;
  startedOn: string;
  docs: DocRecord;
  completedOn: string | null;
  altaAuthorizedBy: string | null;
  urgency: Urgency;
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
const URGENCY_BY_VALUE = Object.fromEntries(URGENCIES.map((u) => [u.value, u]));

function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const u = URGENCY_BY_VALUE[urgency] ?? URGENCY_BY_VALUE.media;
  return <Badge variant="outline" className={cn("border-0 whitespace-nowrap", u.badgeClass)}>{u.label}</Badge>;
}

const STAGE_TONE: Record<OnboardingStage, string> = {
  in_progress: "bg-blue-100 text-blue-800",
  complete: "bg-green-100 text-green-800",
  on_hold: "bg-gray-200 text-gray-800",
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
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide transition-colors",
        DOC_TONE[status],
        canEdit && "hover:ring-2 hover:ring-ring/40"
      )}
    >
      {/* La X del Excel es una palomita; N/A, una raya; pendiente, un círculo vacío. */}
      {status === "received" ? (
        <Check className="size-3 stroke-3" aria-hidden />
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
interface PendingProspect {
  id: string;
  commercialName: string;
  legalName: string | null;
  createdByName: string | null;
}

export function OnboardingsTable({
  editBase,
  canCreate = false,
  canEdit = false,
  canDelete = false,
}: {
  editBase: string;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const panel = editBase.startsWith("/admin") ? "admin" : "collaborator";
  const [rows, setRows] = useState<OnboardingRow[] | null>(null);
  // Prospectos que ya van "En proceso de alta" sin expediente abierto: el alta
  // no se crea sola (pide razón social y fecha), así que se avisan aquí.
  const [pending, setPending] = useState<PendingProspect[]>([]);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<OnboardingStage | "all">("all");
  const [contract, setContract] = useState<ContractStatus | "all">("all");
  const [urgencyFilter, setUrgencyFilter] = useState<Urgency | "all">("all");
  const [sortBy, setSortBy] = useState<"urgency" | "started">("urgency");
  const [holding, setHolding] = useState<OnboardingRow | null>(null);
  const [holdReason, setHoldReason] = useState("");
  const [deleting, setDeleting] = useState<OnboardingRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<ProviderSheetTarget | null>(null);

  const load = useCallback(() => {
    fetch("/api/provider-onboardings")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: OnboardingRow[]) => setRows(d))
      .catch(() => setRows([]));
    fetch("/api/provider-onboardings/pending-prospects")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: PendingProspect[]) => setPending(d))
      .catch(() => setPending([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c: Record<OnboardingStage, number> = { in_progress: 0, complete: 0, on_hold: 0 };
    for (const r of rows ?? []) c[onboardingStage(r)]++;
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (rows ?? []).filter((r) => {
      if (stage !== "all" && onboardingStage(r) !== stage) return false;
      if (contract !== "all" && r.contractStatus !== contract) return false;
      if (urgencyFilter !== "all" && r.urgency !== urgencyFilter) return false;
      if (!q) return true;
      return [r.legalName, r.commercialName, r.email, r.rfc, r.altaAuthorizedBy, r.contractAuthorizedBy, r.notes, r.purchasingNotes]
        .some((v) => (v ?? "").toLowerCase().includes(q));
    });
    // Las más urgentes arriba; a igual urgencia, la más reciente primero.
    return sortBy === "urgency"
      ? [...list].sort((a, b) => urgencyRank(b.urgency) - urgencyRank(a.urgency) || b.startedOn.localeCompare(a.startedOn))
      : list;
  }, [rows, search, stage, contract, urgencyFilter, sortBy]);

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/provider-onboardings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      completedOn?: string | null;
      onHoldSince?: string | null;
      userId?: string | null;
      account?: { status: string; message: string } | null;
    };
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
            ? { ...x, completedOn: data.completedOn ?? x.completedOn, onHoldSince: data.onHoldSince ?? null, userId: data.userId ?? x.userId }
            : x
        ) ?? list
      );
      toast.success(okMsg);
      // Completar el expediente puede crear la cuenta del proveedor.
      if (data.account) {
        if (data.account.status === "skipped") toast.warning(data.account.message, { duration: 10000 });
        else toast.success(data.account.message, { duration: 8000 });
      }
    } catch (e) {
      setRows(prev ?? null);
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    }
  }

  function setDoc(row: OnboardingRow, key: DocKey, status: DocStatus) {
    const docs = { ...row.docs, [key]: status };
    void quick(row, { docs }, { docs: { [key]: status } }, "Expediente actualizado.");
  }

  function setUrgency(row: OnboardingRow, urgency: Urgency) {
    if (urgency === row.urgency) return;
    void quick(row, { urgency }, { urgency }, "Urgencia actualizada.");
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
      {pending.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            {pending.length === 1 ? "1 prospecto espera su alta" : `${pending.length} prospectos esperan su alta`}
          </p>
          <p className="mb-3 text-xs text-amber-800 dark:text-amber-300">
            Están en Prospección como “En proceso de alta” o “Listo para operar”, pero todavía no tienen expediente.
          </p>
          <ul className="divide-y divide-amber-200 dark:divide-amber-900">
            {pending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="min-w-0 text-sm">
                  <span className="font-medium">{p.commercialName}</span>
                  {p.createdByName && <span className="text-muted-foreground text-xs"> · lo registró {p.createdByName}</span>}
                </span>
                {canCreate && (
                  <Button size="sm" asChild>
                    <Link href={`${editBase}/new?prospectId=${p.id}`}>
                      <ClipboardCheck className="size-4" />
                      Iniciar alta
                    </Link>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full space-y-1.5 sm:max-w-56">
          <Label htmlFor="onboarding-search" className="text-muted-foreground text-xs">Buscar</Label>
          <Input id="onboarding-search" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-full space-y-1.5 sm:w-44">
          <Label className="text-muted-foreground text-xs">Alta</Label>
          <AppSelect value={stage} onValueChange={(v) => setStage((v || "all") as OnboardingStage | "all")} options={stageOptions} className="w-full" />
        </div>
        <div className="w-full space-y-1.5 sm:w-64">
          <Label className="text-muted-foreground text-xs">Contrato</Label>
          <AppSelect
            value={contract}
            onValueChange={(v) => setContract((v || "all") as ContractStatus | "all")}
            options={[{ value: "all", label: "Todos los contratos" }, ...CONTRACT_STATUSES.map((c) => ({ value: c.value, label: c.label }))]}
            className="w-full"
          />
        </div>
        <div className="w-full space-y-1.5 sm:w-44">
          <Label className="text-muted-foreground text-xs">Urgencia</Label>
          <AppSelect
            value={urgencyFilter}
            onValueChange={(v) => setUrgencyFilter((v || "all") as Urgency | "all")}
            options={[
              { value: "all", label: "Todas" },
              ...[...URGENCIES].reverse().map((u) => ({ value: u.value, label: `${u.label} (${(rows ?? []).filter((r) => r.urgency === u.value).length})` })),
            ]}
            className="w-full"
          />
        </div>
        <div className="w-full space-y-1.5 sm:w-48">
          <Label className="text-muted-foreground text-xs">Ordenar por</Label>
          <AppSelect
            value={sortBy}
            onValueChange={(v) => setSortBy((v || "urgency") as "urgency" | "started")}
            options={[
              { value: "urgency", label: "Urgencia" },
              { value: "started", label: "Fecha de inicio" },
            ]}
            className="w-full"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          {rows.length === 0 ? "Todavía no hay altas registradas." : "Ninguna alta coincide con los filtros."}
        </p>
      ) : (
        <ExportableTable title="Alta de proveedores">
          <div className="@container/table w-full overflow-x-auto rounded-md border">
            <table className="w-full min-w-max text-xs font-medium tracking-wide md:min-w-0">
              <thead>
                <tr className="bg-primary/[0.07] border-b">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary">Proveedor</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary">Urgencia</th>
                  <th className="hidden px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary @5xl/table:table-cell">Inicio</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary">Expediente</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary">Alta</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary">Contrato</th>
                  <th className="hidden px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary @6xl/table:table-cell">Autoriza</th>
                  {(canEdit || canDelete) && <th className="w-24 px-2 py-2" />}
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => {
                  const st = onboardingStage(r);
                  const progress = docProgress(r.docs);
                  const c = CONTRACT_BY_VALUE[r.contractStatus];
                  return (
                    <tr
                      key={r.id}
                      className={cn("hover:bg-muted/40 cursor-pointer border-b align-top last:border-0", st === "on_hold" && "bg-gray-50 dark:bg-gray-900/40")}
                      onClick={(e) => isRowClick(e) && setViewing({ prospectId: r.prospectId, onboardingId: r.id, name: r.commercialName })}
                    >
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          className="block max-w-52 truncate text-left font-semibold hover:underline min-[1440px]:max-w-64"
                          title={r.legalName}
                          onClick={() => setViewing({ prospectId: r.prospectId, onboardingId: r.id, name: r.commercialName })}
                        >
                          {r.legalName}
                        </button>
                        <span className="text-muted-foreground block max-w-52 truncate text-xs min-[1440px]:max-w-64" title={r.commercialName}>{r.commercialName}</span>
                        {st === "on_hold" && r.holdReason && (
                          <span className="mt-1 block max-w-52 text-xs text-gray-700 min-[1440px]:max-w-64 dark:text-gray-300" title={r.holdReason}>{r.holdReason}</span>
                        )}
                        {r.userId && (
                          <Link
                            href={providerProfileHref(panel, r.userId)}
                            className="text-primary mt-1 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                          >
                            <UserRound className="size-3" aria-hidden />
                            Ver perfil del proveedor
                          </Link>
                        )}
                      </td>
                      <td className="px-3 py-3" data-export={URGENCY_BY_VALUE[r.urgency]?.label}>
                        {canEdit ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              aria-label={`Urgencia de ${r.commercialName}`}
                              className="inline-flex items-center gap-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <UrgencyBadge urgency={r.urgency} />
                              <ChevronDown className="text-muted-foreground size-3 shrink-0" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              {[...URGENCIES].reverse().map((u) => (
                                <DropdownMenuItem key={u.value} onClick={() => setUrgency(r, u.value)}>{u.label}</DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <UrgencyBadge urgency={r.urgency} />
                        )}
                      </td>
                      <td className="text-muted-foreground hidden whitespace-nowrap px-3 py-3 @5xl/table:table-cell">{shortDate(r.startedOn)}</td>
                      <td
                        className="px-3 py-3"
                        data-export={[
                          `${progress.done} de ${progress.total}`,
                          ...(() => {
                            const pend = ONBOARDING_DOCS.filter((d) => r.docs[d.key] === "pending").map((d) => d.label);
                            return pend.length ? [`Pendiente: ${pend.join(", ")}`] : [];
                          })(),
                        ].join(" · ")}
                      >
                        <div className="flex w-64 max-w-64 flex-wrap gap-1 min-[1440px]:w-72 min-[1440px]:max-w-72">
                          {ONBOARDING_DOCS.map((d) => (
                            <DocChip key={d.key} docKey={d.key} status={r.docs[d.key]} canEdit={canEdit} onChange={(next) => setDoc(r, d.key, next)} />
                          ))}
                        </div>
                        <span className="text-muted-foreground mt-1 block text-xs">{progress.done} de {progress.total}</span>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant="outline" className={cn("border-0 whitespace-nowrap", STAGE_TONE[st])}>{STAGE_LABELS[st]}</Badge>
                        {r.completedOn && <span className="text-muted-foreground mt-1 block text-xs">{shortDate(r.completedOn)}</span>}
                      </td>
                      <td className="px-3 py-3">
                        {canEdit ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex max-w-56 items-center gap-1 rounded-full text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
                              <Badge variant="outline" className={cn("rounded-md border-0 whitespace-normal", c.badgeClass)}>{c.label}</Badge>
                              <ChevronDown className="text-muted-foreground size-3 shrink-0" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              {CONTRACT_STATUSES.map((s) => (
                                <DropdownMenuItem key={s.value} onClick={() => setContractStatus(r, s.value)}>{s.label}</DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <Badge variant="outline" className={cn("rounded-md border-0 whitespace-normal", c.badgeClass)}>{c.label}</Badge>
                        )}
                        {r.signedReceivedOn && <span className="text-muted-foreground mt-1 block text-xs">Firmado {shortDate(r.signedReceivedOn)}</span>}
                      </td>
                      <td className="text-muted-foreground hidden px-3 py-3 text-xs @6xl/table:table-cell">
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
                                  <PauseCircle className="size-3.5 text-gray-600" />
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
        </ExportableTable>
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

      <ProviderSheet
        target={viewing}
        onClose={() => setViewing(null)}
        dashboardBase={editBase.replace(/\/[^/]+$/, "")}
        canEditOnboarding={canEdit}
      />
    </div>
  );
}
