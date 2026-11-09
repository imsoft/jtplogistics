"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronDown, Handshake, Mail, Pencil, Phone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/components/ui/confirm-provider";
import { cn, formatMxn, formatPhone } from "@/lib/utils";
import { normalizeSearch } from "@/lib/search";
import { isFollowUpDue } from "@/lib/crm";
import { LEAD_STAGES, followUpState, isOpenStage, type LeadStage } from "@/lib/client-leads";
import { ExportableTable } from "@/components/dashboard/export/exportable-table";
import {
  ALL_OWNERS,
  CrmFilters,
  CrmTableSkeleton,
  FollowUpCell,
  LastActivityCell,
  ReasonDialog,
  StageBadge,
  SummaryCards,
  isRowClick,
  thClass,
  todayKey,
  useFichaParam,
} from "@/components/dashboard/crm/crm-ui";
import { LeadSheet } from "./lead-sheet";
import type { Lead } from "./lead-types";

const PENDING = "pendientes";
const ALL = "todos";

/**
 * Prospección de clientes: las empresas a las que se les quiere vender, en qué
 * etapa va cada una y qué toca hacer. Funciona y se ve igual que Prospección
 * de proveedores (mismas piezas en crm/crm-ui.tsx); solo cambia la información.
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
  const confirm = useConfirm();
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>(ALL);
  const [owner, setOwner] = useState(ALL_OWNERS);
  const [losing, setLosing] = useState<Lead | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
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

  useFichaParam(setViewing);

  const owners = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of leads ?? []) if (l.ownerId && l.ownerName) map.set(l.ownerId, l.ownerName);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "es")).map(([value, label]) => ({ value, label }));
  }, [leads]);

  const byOwner = useMemo(() => (leads ?? []).filter((l) => owner === ALL_OWNERS || l.ownerId === owner), [leads, owner]);

  const summary = useMemo(() => {
    const counts = new Map<string, number>();
    let pending = 0;
    let open = 0;
    let pipeline = 0;
    for (const l of byOwner) {
      counts.set(l.stage, (counts.get(l.stage) ?? 0) + 1);
      if (isFollowUpDue(followUpState(l.nextFollowUpOn, today, l.stage))) pending++;
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
      if (filter === PENDING) {
        if (!isFollowUpDue(followUpState(l.nextFollowUpOn, today, l.stage))) return false;
      } else if (filter !== ALL && l.stage !== filter) return false;
      if (!q) return true;
      return [l.companyName, l.contactName, l.phone, l.email, l.city, l.industry, l.rfc, l.address, l.notes, l.ownerName, l.nextAction]
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
    if (stage === "perdido") return setLosing(l);
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

  async function confirmLost(reason: string) {
    if (!losing) return false;
    try {
      await patch(losing.id, { stage: "perdido", lostReason: reason });
      toast.success("Prospecto marcado como perdido.");
      setLosing(null);
      load();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
      return false;
    }
  }

  async function remove(l: Lead) {
    const ok = await confirm({
      title: `¿Eliminar ${l.companyName}?`,
      description: "Se borra con todas sus actividades y no se puede deshacer. Si no se cerró, mejor márcalo como perdido con su motivo.",
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/client-leads/${l.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setLeads((list) => list?.filter((x) => x.id !== l.id) ?? list);
      toast.success("Prospecto eliminado.");
    } catch {
      toast.error("No se pudo eliminar.");
    }
  }

  const openSheet = (id: string, convert = false) => {
    setConverting(convert);
    setViewing(id);
  };

  if (leads === null) return <CrmTableSkeleton />;

  return (
    <div className="min-w-0 space-y-4">
      <SummaryCards
        cards={[
          { label: "Prospectos abiertos", value: summary.open, onClick: () => setFilter(ALL) },
          { label: "Venta mensual en juego", value: `$${formatMxn(summary.pipeline)}`, hint: "Suma de lo estimado en los abiertos." },
          {
            label: "Seguimientos para hoy o vencidos",
            value: summary.pending,
            alert: summary.pending > 0,
            onClick: () => setFilter(PENDING),
          },
        ]}
      />

      <CrmFilters
        searchId="leads-search"
        search={search}
        onSearch={setSearch}
        owner={owner}
        onOwner={setOwner}
        owners={owners}
        filter={filter}
        onFilter={setFilter}
        chips={[
          { value: ALL, label: "Todos", count: byOwner.length },
          { value: PENDING, label: "Seguimiento pendiente", count: summary.pending },
          ...LEAD_STAGES.map((s) => ({ value: s.value, label: s.label, count: summary.counts.get(s.value) ?? 0 })),
        ]}
      />

      {visible.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          {leads.length === 0
            ? "Todavía no hay prospectos de cliente. Registra el primero con «Nuevo prospecto»."
            : "Ningún prospecto coincide con los filtros."}
        </p>
      ) : (
        <ExportableTable title="Prospección de clientes">
          <div className="@container/table w-full overflow-x-auto rounded-md border">
            <table className="w-full min-w-max text-sm md:min-w-0">
              <thead>
                <tr className="bg-primary/[0.07] border-b">
                  <th className={thClass}>Empresa</th>
                  <th className={cn(thClass, "hidden @3xl/table:table-cell")}>Contacto</th>
                  <th className={thClass}>Etapa</th>
                  <th className={thClass}>Próximo seguimiento</th>
                  <th className={cn(thClass, "hidden @5xl/table:table-cell")}>Responsable</th>
                  <th className={cn(thClass, "hidden text-right @6xl/table:table-cell")}>Venta mensual</th>
                  <th className={cn(thClass, "hidden @7xl/table:table-cell")}>Última actividad</th>
                  {(canEdit || canDelete) && <th className="w-24 px-2 py-2" />}
                </tr>
              </thead>
              <tbody>
                {visible.map((l) => (
                  <tr
                    key={l.id}
                    className="hover:bg-muted/40 cursor-pointer border-b align-top last:border-0"
                    onClick={(e) => isRowClick(e) && openSheet(l.id)}
                  >
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        className="block max-w-56 truncate text-left font-semibold hover:underline"
                        title={l.companyName}
                        onClick={() => openSheet(l.id)}
                      >
                        {l.companyName}
                      </button>
                      {(l.industry || l.city) && (
                        <span className="text-muted-foreground block text-xs">{[l.industry, l.city].filter(Boolean).join(" · ")}</span>
                      )}
                      {l.clientName && <span className="block text-xs text-green-700">Cliente: {l.clientName}</span>}
                    </td>
                    <td className="hidden px-3 py-3 @3xl/table:table-cell">
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
                    <td className="px-3 py-3">
                      {canEdit ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger className="focus-visible:ring-ring inline-flex items-center gap-1 rounded-full outline-none focus-visible:ring-2">
                            <StageBadge stage={l.stage} stages={LEAD_STAGES} />
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
                        <StageBadge stage={l.stage} stages={LEAD_STAGES} />
                      )}
                      {l.stage === "perdido" && l.lostReason && (
                        <span className="text-muted-foreground mt-1 block max-w-56 truncate text-xs" title={l.lostReason}>
                          {l.lostReason}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <FollowUpCell nextFollowUpOn={l.nextFollowUpOn} nextAction={l.nextAction} open={isOpenStage(l.stage)} today={today} />
                    </td>
                    <td className="text-muted-foreground hidden px-3 py-3 @5xl/table:table-cell">{l.ownerName ?? "—"}</td>
                    <td className="hidden px-3 py-3 text-right whitespace-nowrap @6xl/table:table-cell">
                      {l.estimatedMonthly != null ? `$${formatMxn(l.estimatedMonthly)}` : "—"}
                    </td>
                    <td className="text-muted-foreground hidden px-3 py-3 @7xl/table:table-cell">
                      <LastActivityCell activity={l.lastActivity} />
                    </td>
                    {(canEdit || canDelete) && (
                      <td className="px-2 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && !l.clientId && l.stage !== "perdido" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              aria-label={`Convertir ${l.companyName} en cliente`}
                              title="Convertir en cliente"
                              onClick={() => openSheet(l.id, true)}
                            >
                              <Handshake className="size-3.5" />
                            </Button>
                          )}
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="size-7" asChild>
                              <Link href={`${basePath}/${l.id}/edit`} aria-label={`Editar ${l.companyName}`} title="Editar">
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
                              title="Eliminar"
                              onClick={() => remove(l)}
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

      <ReasonDialog
        open={losing !== null}
        title={`Marcar ${losing?.companyName ?? ""} como perdido`}
        description="Queda en la lista con el motivo, para saber qué pasó si se vuelve a buscar."
        label="Por qué se perdió"
        hint="Precio, se quedó con su transportista, no mueve nuestras rutas…"
        confirmLabel="Marcar perdido"
        initial={losing?.lostReason ?? ""}
        onCancel={() => setLosing(null)}
        onConfirm={confirmLost}
      />

      <LeadSheet
        leadId={viewing}
        onClose={() => {
          setViewing(null);
          setConverting(false);
        }}
        onChanged={load}
        basePath={basePath}
        canEdit={canEdit}
        canDelete={canDelete}
        converting={converting}
        onConvertingChange={setConverting}
      />
    </div>
  );
}
