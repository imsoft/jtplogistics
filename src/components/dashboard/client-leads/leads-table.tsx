"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronDown, Loader2, Mail, Pencil, Phone, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { cn, formatMxn, formatPhone } from "@/lib/utils";
import { normalizeSearch } from "@/lib/search";
import {
  LEAD_ACTIVITY_LABELS,
  LEAD_STAGES,
  followUpState,
  isOpenStage,
  type LeadStage,
} from "@/lib/client-leads";
import { shortDay, todayKey, type Lead } from "./lead-types";
import { ExportableTable } from "@/components/dashboard/export/exportable-table";

const STAGE_BY_VALUE = Object.fromEntries(LEAD_STAGES.map((s) => [s.value, s]));

export function StageBadge({ stage }: { stage: LeadStage }) {
  const cfg = STAGE_BY_VALUE[stage];
  return (
    <Badge variant="outline" className={cn("border-0 whitespace-nowrap", cfg.badgeClass)}>
      {cfg.label}
    </Badge>
  );
}

/** Próximo seguimiento con su estado en palabras, no solo en color. */
export function FollowUpCell({ lead, today }: { lead: Pick<Lead, "nextFollowUpOn" | "nextAction" | "stage">; today: string }) {
  const state = followUpState(lead.nextFollowUpOn, today, lead.stage);
  if (!lead.nextFollowUpOn || !isOpenStage(lead.stage)) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="space-y-0.5">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 whitespace-nowrap text-sm",
          state === "vencido" && "text-destructive font-semibold",
          state === "hoy" && "font-semibold text-amber-700"
        )}
      >
        {shortDay(lead.nextFollowUpOn)}
        {state === "vencido" && <span className="text-xs">· vencido</span>}
        {state === "hoy" && <span className="text-xs">· hoy</span>}
      </span>
      {lead.nextAction && (
        <span className="text-muted-foreground block max-w-56 truncate text-xs" title={lead.nextAction}>
          {lead.nextAction}
        </span>
      )}
    </div>
  );
}

type Filter = LeadStage | "todos" | "pendientes";

/**
 * CRM de clientes: las empresas a las que se les quiere vender, en qué etapa
 * va cada una y qué toca hacer. La etapa se cambia aquí mismo; marcar perdido
 * pide el motivo.
 */
export function LeadsTable({
  basePath,
  canEdit = false,
  canDelete = false,
}: {
  basePath: string;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [owner, setOwner] = useState("");
  const [losing, setLosing] = useState<Lead | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [deleting, setDeleting] = useState<Lead | null>(null);
  const [busy, setBusy] = useState(false);
  const today = todayKey();

  const load = useCallback(() => {
    fetch("/api/client-leads")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Lead[]) => setLeads(d))
      .catch(() => setLeads([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const owners = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of leads ?? []) if (l.ownerId && l.ownerName) map.set(l.ownerId, l.ownerName);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "es")).map(([value, label]) => ({ value, label }));
  }, [leads]);

  const byOwner = useMemo(() => (leads ?? []).filter((l) => !owner || l.ownerId === owner), [leads, owner]);

  const summary = useMemo(() => {
    const counts = new Map<string, number>();
    let pending = 0;
    let open = 0;
    let pipeline = 0;
    for (const l of byOwner) {
      counts.set(l.stage, (counts.get(l.stage) ?? 0) + 1);
      const st = followUpState(l.nextFollowUpOn, today, l.stage);
      if (st === "vencido" || st === "hoy") pending++;
      if (isOpenStage(l.stage)) {
        open++;
        pipeline += l.estimatedMonthly ?? 0;
      }
    }
    return { counts, pending, open, pipeline };
  }, [byOwner, today]);

  const visible = useMemo(() => {
    const q = normalizeSearch(search);
    return byOwner.filter((l) => {
      if (filter === "pendientes") {
        const st = followUpState(l.nextFollowUpOn, today, l.stage);
        if (st !== "vencido" && st !== "hoy") return false;
      } else if (filter !== "todos" && l.stage !== filter) return false;
      if (!q) return true;
      return [l.companyName, l.contactName, l.phone, l.email, l.city, l.industry, l.notes, l.ownerName]
        .some((v) => normalizeSearch(v ?? "").includes(q));
    });
  }, [byOwner, search, filter, today]);

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/client-leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(d.error ?? "No se pudo guardar.");
    }
  }

  async function changeStage(l: Lead, stage: LeadStage) {
    if (stage === l.stage) return;
    // Perder no se aplica de inmediato: primero se pide el motivo.
    if (stage === "perdido") {
      setLostReason(l.lostReason ?? "");
      setLosing(l);
      return;
    }
    const prev = leads;
    setLeads((list) => list?.map((x) => (x.id === l.id ? { ...x, stage } : x)) ?? list);
    try {
      await patch(l.id, { stage });
      toast.success("Etapa actualizada.");
    } catch (e) {
      setLeads(prev ?? null);
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar.");
    }
  }

  async function confirmLost() {
    if (!losing) return;
    setBusy(true);
    try {
      await patch(losing.id, { stage: "perdido", lostReason: lostReason.trim() });
      toast.success("Prospecto marcado como perdido.");
      setLosing(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(l: Lead) {
    setBusy(true);
    try {
      const res = await fetch(`/api/client-leads/${l.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setLeads((list) => list?.filter((x) => x.id !== l.id) ?? list);
      toast.success("Prospecto eliminado.");
    } catch {
      toast.error("No se pudo eliminar.");
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  }

  if (leads === null) {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const chip = (value: Filter, label: string, count: number) => (
    <Button
      key={value}
      type="button"
      variant={filter === value ? "secondary" : "outline"}
      size="sm"
      onClick={() => setFilter(value)}
    >
      {label} ({count})
    </Button>
  );

  return (
    <div className="min-w-0 space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="py-0">
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Prospectos abiertos</p>
            <p className="mt-1 text-2xl font-bold">{summary.open}</p>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Venta mensual en juego</p>
            <p className="mt-1 text-2xl font-bold">${formatMxn(summary.pipeline)}</p>
            <p className="text-muted-foreground text-xs">Suma de lo estimado en los abiertos.</p>
          </CardContent>
        </Card>
        <button
          type="button"
          onClick={() => setFilter("pendientes")}
          className="text-left"
          aria-label="Ver seguimientos pendientes"
        >
          <Card className={cn("h-full py-0 transition-colors hover:bg-muted/40", summary.pending > 0 && "border-destructive/40")}>
            <CardContent className="p-4">
              <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Seguimientos para hoy o vencidos</p>
              <p className={cn("mt-1 text-2xl font-bold", summary.pending > 0 && "text-destructive")}>{summary.pending}</p>
            </CardContent>
          </Card>
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full space-y-1.5 sm:max-w-sm">
          <Label htmlFor="leads-search">Buscar</Label>
          <Input id="leads-search" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-full space-y-1.5 sm:w-64">
          <Label>Responsable</Label>
          <AppSelect value={owner} onValueChange={(v) => setOwner(v || "")} options={owners} className="w-full" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {chip("todos", "Todos", byOwner.length)}
        {chip("pendientes", "Seguimiento pendiente", summary.pending)}
        {LEAD_STAGES.map((s) => chip(s.value, s.label, summary.counts.get(s.value) ?? 0))}
      </div>

      {visible.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          {leads.length === 0
            ? "Todavía no hay prospectos de cliente. Registra el primero con «Nuevo prospecto»."
            : "Ningún prospecto coincide con los filtros."}
        </p>
      ) : (
        <ExportableTable title="CRM de clientes">
          <div className="@container/table w-full overflow-x-auto rounded-md border">
            <table className="w-full min-w-max text-sm md:min-w-0">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="px-4 py-2 text-left font-medium">Empresa</th>
                  <th className="hidden px-4 py-2 text-left font-medium @3xl/table:table-cell">Contacto</th>
                  <th className="px-4 py-2 text-left font-medium">Etapa</th>
                  <th className="px-4 py-2 text-left font-medium">Próximo seguimiento</th>
                  <th className="hidden px-4 py-2 text-left font-medium @5xl/table:table-cell">Responsable</th>
                  <th className="hidden px-4 py-2 text-right font-medium @6xl/table:table-cell">Venta mensual</th>
                  <th className="hidden px-4 py-2 text-left font-medium @7xl/table:table-cell">Última actividad</th>
                  {(canEdit || canDelete) && <th className="w-16 px-2 py-2" />}
                </tr>
              </thead>
              <tbody>
                {visible.map((l) => (
                  <tr key={l.id} className="border-b align-top last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`${basePath}/${l.id}`}
                        className="text-primary block max-w-56 truncate font-medium hover:underline"
                        title={l.companyName}
                      >
                        {l.companyName}
                      </Link>
                      {(l.industry || l.city) && (
                        <span className="text-muted-foreground block text-xs">
                          {[l.industry, l.city].filter(Boolean).join(" · ")}
                        </span>
                      )}
                      {l.clientName && <span className="block text-xs text-green-700">Cliente: {l.clientName}</span>}
                    </td>
                    <td className="hidden px-4 py-3 @3xl/table:table-cell">
                      {l.contactName && <span className="block">{l.contactName}</span>}
                      {l.phone && (
                        <span className="text-muted-foreground flex items-center gap-1 text-xs">
                          <Phone className="size-3" />
                          {formatPhone(l.phone)}
                        </span>
                      )}
                      {l.email && (
                        <span className="text-muted-foreground text-email flex items-center gap-1 text-xs">
                          <Mail className="size-3" />
                          {l.email}
                        </span>
                      )}
                      {!l.contactName && !l.phone && !l.email && <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {canEdit ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger className="focus-visible:ring-ring inline-flex items-center gap-1 rounded-full outline-none focus-visible:ring-2">
                            <StageBadge stage={l.stage} />
                            <ChevronDown className="text-muted-foreground size-3" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {LEAD_STAGES.map((s) => (
                              <DropdownMenuItem key={s.value} onClick={() => changeStage(l, s.value)}>
                                {s.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <StageBadge stage={l.stage} />
                      )}
                      {l.stage === "perdido" && l.lostReason && (
                        <span className="text-muted-foreground mt-1 block max-w-56 truncate text-xs" title={l.lostReason}>
                          {l.lostReason}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <FollowUpCell lead={l} today={today} />
                    </td>
                    <td className="text-muted-foreground hidden px-4 py-3 @5xl/table:table-cell">{l.ownerName ?? "—"}</td>
                    <td className="hidden px-4 py-3 text-right whitespace-nowrap @6xl/table:table-cell">
                      {l.estimatedMonthly != null ? `$${formatMxn(l.estimatedMonthly)}` : "—"}
                    </td>
                    <td className="text-muted-foreground hidden px-4 py-3 @7xl/table:table-cell">
                      {l.lastActivity ? (
                        <>
                          <span className="block text-xs whitespace-nowrap">
                            {LEAD_ACTIVITY_LABELS[l.lastActivity.type]} · {shortDay(l.lastActivity.occurredOn)}
                          </span>
                          <span className="block max-w-56 truncate text-xs" title={l.lastActivity.summary}>
                            {l.lastActivity.summary}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    {(canEdit || canDelete) && (
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="size-7" asChild>
                              <Link href={`${basePath}/${l.id}/edit`} aria-label={`Editar ${l.companyName}`}>
                                <Pencil className="size-3.5" />
                              </Link>
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              aria-label={`Eliminar ${l.companyName}`}
                              onClick={() => setDeleting(l)}
                            >
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
        </ExportableTable>
      )}

      <Dialog open={losing !== null} onOpenChange={(open) => !open && setLosing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar {losing?.companyName} como perdido</DialogTitle>
            <DialogDescription>
              Queda en la lista con el motivo, para saber qué pasó si se vuelve a buscar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="lost-reason">Por qué se perdió</Label>
            <Textarea id="lost-reason" rows={3} value={lostReason} onChange={(e) => setLostReason(e.target.value)} />
            <p className="text-muted-foreground text-xs">Precio, se quedó con su transportista, no mueve nuestras rutas…</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLosing(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmLost} disabled={busy || !lostReason.trim()}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Marcar perdido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {deleting?.companyName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borra con todas sus actividades y no se puede deshacer. Si no se cerró, mejor márcalo como perdido con su
              motivo.
            </AlertDialogDescription>
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
