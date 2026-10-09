"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronDown, ClipboardCheck, Globe, Loader2, Mail, Pencil, Phone, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import { cn, formatPhone } from "@/lib/utils";
import {
  PROSPECT_COVERAGE_LABELS,
  PROSPECT_SOURCE_LABELS,
  PROSPECT_STATUSES,
  type ProspectStatus,
} from "@/lib/provider-prospects";

interface Prospect {
  id: string;
  commercialName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  source: string | null;
  coverage: string | null;
  status: ProspectStatus;
  legalName: string | null;
  city: string | null;
  contactedOn: string | null;
  notes: string | null;
  discardReason: string | null;
  createdByName: string | null;
}

const STATUS_BY_VALUE = Object.fromEntries(PROSPECT_STATUSES.map((s) => [s.value, s]));

function StatusBadge({ status }: { status: ProspectStatus }) {
  const cfg = STATUS_BY_VALUE[status];
  return (
    <Badge variant="outline" className={cn("border-0 whitespace-nowrap", cfg.badgeClass)}>
      {cfg.label}
    </Badge>
  );
}

function shortDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

/**
 * Prospección de proveedores: los transportistas que se están buscando, con su
 * etapa. La etapa se cambia aquí mismo; descartar pide el motivo, porque meses
 * después nadie se acuerda de por qué se descartó.
 */
export function ProspectsTable({
  editBase,
  canEdit = false,
  canDelete = false,
}: {
  editBase: string;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const [prospects, setProspects] = useState<Prospect[] | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ProspectStatus | "todos">("todos");
  const [discarding, setDiscarding] = useState<Prospect | null>(null);
  const [discardReason, setDiscardReason] = useState("");
  const [deleting, setDeleting] = useState<Prospect | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/provider-prospects")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Prospect[]) => setProspects(d))
      .catch(() => setProspects([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of prospects ?? []) map.set(p.status, (map.get(p.status) ?? 0) + 1);
    return map;
  }, [prospects]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (prospects ?? []).filter((p) => {
      if (filter !== "todos" && p.status !== filter) return false;
      if (!q) return true;
      return [p.commercialName, p.contactName, p.phone, p.email, p.city, p.legalName, p.notes]
        .some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [prospects, search, filter]);

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/provider-prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(d.error ?? "No se pudo guardar.");
    }
  }

  async function changeStatus(p: Prospect, status: ProspectStatus) {
    if (status === p.status) return;
    // Descartar no se aplica de inmediato: primero se pide el motivo.
    if (status === "descartado") {
      setDiscardReason(p.discardReason ?? "");
      setDiscarding(p);
      return;
    }
    const prev = prospects;
    setProspects((list) => list?.map((x) => (x.id === p.id ? { ...x, status } : x)) ?? list);
    try {
      await patch(p.id, { status });
      toast.success("Etapa actualizada.");
    } catch (e) {
      setProspects(prev ?? null);
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar.");
    }
  }

  async function confirmDiscard() {
    if (!discarding) return;
    setBusy(true);
    try {
      await patch(discarding.id, { status: "descartado", discardReason: discardReason.trim() });
      toast.success("Prospecto descartado.");
      setDiscarding(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo descartar.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: Prospect) {
    setBusy(true);
    try {
      const res = await fetch(`/api/provider-prospects/${p.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setProspects((list) => list?.filter((x) => x.id !== p.id) ?? list);
      toast.success("Prospecto eliminado.");
    } catch {
      toast.error("No se pudo eliminar.");
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  }

  if (prospects === null) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-sm"
          aria-label="Buscar prospecto"
        />
        <Button
          type="button"
          variant={filter === "todos" ? "secondary" : "outline"}
          size="sm"
          onClick={() => setFilter("todos")}
        >
          Todos ({prospects.length})
        </Button>
        {PROSPECT_STATUSES.map((s) => (
          <Button
            key={s.value}
            type="button"
            variant={filter === s.value ? "secondary" : "outline"}
            size="sm"
            onClick={() => setFilter(s.value)}
          >
            {s.label} ({counts.get(s.value) ?? 0})
          </Button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          {prospects.length === 0
            ? "Todavía no hay prospectos registrados."
            : "Ningún prospecto coincide con la búsqueda."}
        </p>
      ) : (
        <div className="@container/table w-full overflow-x-auto rounded-md border">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="bg-muted/40 border-b">
                <th className="px-4 py-2 text-left font-medium">Proveedor</th>
                <th className="px-4 py-2 text-left font-medium">Contacto</th>
                <th className="hidden px-4 py-2 text-left font-medium @4xl/table:table-cell">Cómo se consiguió</th>
                <th className="hidden px-4 py-2 text-left font-medium @5xl/table:table-cell">Cobertura</th>
                <th className="hidden px-4 py-2 text-left font-medium @6xl/table:table-cell">Contacto el</th>
                <th className="px-4 py-2 text-left font-medium">Etapa</th>
                {(canEdit || canDelete) && <th className="px-2 py-2 w-16" />}
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id} className="border-b last:border-0 align-top">
                  <td className="px-4 py-3">
                    <span className="block max-w-56 truncate font-medium" title={p.commercialName}>
                      {p.commercialName}
                    </span>
                    {p.city && <span className="text-muted-foreground block text-xs">{p.city}</span>}
                    {p.notes && (
                      <span className="text-muted-foreground block max-w-72 truncate text-xs" title={p.notes}>
                        {p.notes}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.contactName && <span className="block">{p.contactName}</span>}
                    {p.phone && (
                      <span className="text-muted-foreground flex items-center gap-1 text-xs">
                        <Phone className="size-3" />
                        {formatPhone(p.phone)}
                      </span>
                    )}
                    {p.email && (
                      <span className="text-muted-foreground text-email flex items-center gap-1 text-xs">
                        <Mail className="size-3" />
                        {p.email}
                      </span>
                    )}
                    {p.website && (
                      <span className="text-muted-foreground flex items-center gap-1 text-xs">
                        <Globe className="size-3" />
                        {p.website}
                      </span>
                    )}
                    {!p.contactName && !p.phone && !p.email && !p.website && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="text-muted-foreground hidden px-4 py-3 @4xl/table:table-cell">
                    {p.source ? PROSPECT_SOURCE_LABELS[p.source as keyof typeof PROSPECT_SOURCE_LABELS] : "—"}
                  </td>
                  <td className="text-muted-foreground hidden px-4 py-3 @5xl/table:table-cell">
                    {p.coverage ? PROSPECT_COVERAGE_LABELS[p.coverage as keyof typeof PROSPECT_COVERAGE_LABELS] : "—"}
                  </td>
                  <td className="text-muted-foreground hidden whitespace-nowrap px-4 py-3 @6xl/table:table-cell">
                    {p.contactedOn ? shortDate(p.contactedOn) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {canEdit ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <StatusBadge status={p.status} />
                          <ChevronDown className="text-muted-foreground size-3" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {PROSPECT_STATUSES.map((s) => (
                            <DropdownMenuItem key={s.value} onClick={() => changeStatus(p, s.value)}>
                              {s.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <StatusBadge status={p.status} />
                    )}
                    {p.status === "descartado" && p.discardReason && (
                      <span className="text-muted-foreground mt-1 block max-w-56 text-xs" title={p.discardReason}>
                        {p.discardReason}
                      </span>
                    )}
                  </td>
                  {(canEdit || canDelete) && (
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-1">
                        {canEdit && (p.status === "en_alta" || p.status === "listo") && (
                          <Button variant="ghost" size="icon" className="size-7" asChild>
                            <Link
                              href={`${editBase.replace(/\/prospects$/, "/provider-onboardings")}/new?prospectId=${p.id}`}
                              aria-label={`Iniciar alta de ${p.commercialName}`}
                              title="Iniciar alta de proveedor"
                            >
                              <ClipboardCheck className="size-3.5" />
                            </Link>
                          </Button>
                        )}
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="size-7" asChild>
                            <Link href={`${editBase}/${p.id}/edit`} aria-label={`Editar ${p.commercialName}`}>
                              <Pencil className="size-3.5" />
                            </Link>
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            aria-label={`Eliminar ${p.commercialName}`}
                            onClick={() => setDeleting(p)}
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
      )}

      <Dialog open={discarding !== null} onOpenChange={(open) => !open && setDiscarding(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Descartar {discarding?.commercialName}</DialogTitle>
            <DialogDescription>
              Queda en la lista con el motivo, para no volver a contactarlo sin saber
              qué pasó la vez pasada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="discard-reason">Por qué se descarta</Label>
            <Textarea
              id="discard-reason"
              rows={3}
              value={discardReason}
              onChange={(e) => setDiscardReason(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Teléfono equivocado, no le interesa, no corre nuestras rutas, documentos
              incompletos…
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscarding(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmDiscard} disabled={busy || !discardReason.trim()}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Descartar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {deleting?.commercialName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borra de la lista y no se puede deshacer. Si lo que quieres es dejar
              constancia de que no sirvió, mejor descártalo con su motivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && remove(deleting)}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
