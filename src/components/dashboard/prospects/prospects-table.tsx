"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ClipboardCheck, Globe, Mail, Pencil, Phone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/components/ui/confirm-provider";
import { cn, formatPhone } from "@/lib/utils";
import { normalizeSearch } from "@/lib/search";
import { followUpStateFor, isFollowUpDue } from "@/lib/crm";
import {
  PROSPECT_COVERAGE_LABELS,
  PROSPECT_STATUSES,
  isOpenProspectStatus,
  type ProspectStatus,
} from "@/lib/provider-prospects";
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
  type CrmLastActivity,
} from "@/components/dashboard/crm/crm-ui";
import { ProviderSheet, type ProviderSheetTarget } from "./provider-sheet";

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
  nextAction: string | null;
  nextFollowUpOn: string | null;
  ownerId: string | null;
  ownerName: string | null;
  createdByName: string | null;
  /** El alta que ya se abrió para este prospecto, si hay. */
  onboardingId: string | null;
  lastActivity: CrmLastActivity | null;
}

const PENDING = "pendientes";
const ALL = "todos";

/**
 * Prospección de proveedores: los transportistas que se están buscando, en qué
 * etapa va cada uno y qué toca hacer. Funciona y se ve igual que Prospección
 * de clientes (mismas piezas en crm/crm-ui.tsx); solo cambia la información.
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
  const router = useRouter();
  const confirm = useConfirm();
  const dashboardBase = editBase.replace(/\/prospects$/, "");
  const onboardingHref = (id: string) => `${dashboardBase}/provider-onboardings/new?prospectId=${id}`;
  const [prospects, setProspects] = useState<Prospect[] | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>(ALL);
  const [owner, setOwner] = useState(ALL_OWNERS);
  const [discarding, setDiscarding] = useState<Prospect | null>(null);
  const [viewing, setViewing] = useState<ProviderSheetTarget | null>(null);
  const today = todayKey();

  const load = useCallback(() => {
    fetch("/api/provider-prospects")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Prospect[]) => setProspects(d))
      .catch(() => setProspects([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFichaParam((id) => setViewing({ prospectId: id, onboardingId: null, name: "" }));

  const dueOf = useCallback(
    (p: Prospect) => isFollowUpDue(followUpStateFor(p.nextFollowUpOn, today, isOpenProspectStatus(p.status))),
    [today]
  );

  const owners = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of prospects ?? []) if (p.ownerId && p.ownerName) map.set(p.ownerId, p.ownerName);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "es")).map(([value, label]) => ({ value, label }));
  }, [prospects]);

  const byOwner = useMemo(() => (prospects ?? []).filter((p) => owner === ALL_OWNERS || p.ownerId === owner), [prospects, owner]);

  const summary = useMemo(() => {
    const counts = new Map<string, number>();
    let pending = 0;
    let open = 0;
    for (const p of byOwner) {
      counts.set(p.status, (counts.get(p.status) ?? 0) + 1);
      if (dueOf(p)) pending++;
      if (isOpenProspectStatus(p.status)) open++;
    }
    return { counts, pending, open };
  }, [byOwner, dueOf]);

  const visible = useMemo(() => {
    const q = normalizeSearch(search);
    return byOwner.filter((p) => {
      if (filter === PENDING) {
        if (!dueOf(p)) return false;
      } else if (filter !== ALL && p.status !== filter) return false;
      if (!q) return true;
      return [p.commercialName, p.legalName, p.contactName, p.phone, p.email, p.city, p.website, p.notes, p.ownerName, p.nextAction]
        .some((v) => normalizeSearch(v ?? "").includes(q));
    });
  }, [byOwner, search, filter, dueOf]);

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
    if (status === "descartado") return setDiscarding(p);
    const prev = prospects;
    setProspects((list) => list?.map((x) => (x.id === p.id ? { ...x, status } : x)) ?? list);
    try {
      await patch(p.id, { status });
      if (status === "en_alta" && !p.onboardingId) {
        // El alta no se crea sola: pide razón social y fecha de inicio.
        toast.success("Etapa actualizada. Falta abrir su alta de proveedor.", {
          action: { label: "Iniciar alta", onClick: () => router.push(onboardingHref(p.id)) },
          duration: 10000,
        });
      } else {
        toast.success("Etapa actualizada.");
      }
    } catch (e) {
      setProspects(prev ?? null);
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar.");
    }
  }

  async function confirmDiscard(reason: string) {
    if (!discarding) return false;
    try {
      await patch(discarding.id, { status: "descartado", discardReason: reason });
      toast.success("Prospecto descartado.");
      setDiscarding(null);
      load();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo descartar.");
      return false;
    }
  }

  async function remove(p: Prospect) {
    const ok = await confirm({
      title: `¿Eliminar ${p.commercialName}?`,
      description: "Se borra con todas sus actividades y no se puede deshacer. Si solo no sirvió, mejor descártalo con su motivo.",
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/provider-prospects/${p.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setProspects((list) => list?.filter((x) => x.id !== p.id) ?? list);
      toast.success("Prospecto eliminado.");
    } catch {
      toast.error("No se pudo eliminar.");
    }
  }

  const openSheet = (p: Prospect) => setViewing({ prospectId: p.id, onboardingId: p.onboardingId, name: p.commercialName });

  if (prospects === null) return <CrmTableSkeleton />;

  return (
    <div className="min-w-0 space-y-4">
      <SummaryCards
        cards={[
          { label: "Prospectos abiertos", value: summary.open, onClick: () => setFilter(ALL) },
          {
            label: "En proceso de alta",
            value: summary.counts.get("en_alta") ?? 0,
            hint: "Con su expediente de alta abierto.",
            onClick: () => setFilter("en_alta"),
          },
          {
            label: "Seguimientos para hoy o vencidos",
            value: summary.pending,
            alert: summary.pending > 0,
            onClick: () => setFilter(PENDING),
          },
        ]}
      />

      <CrmFilters
        searchId="prospects-search"
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
          ...PROSPECT_STATUSES.map((s) => ({ value: s.value, label: s.label, count: summary.counts.get(s.value) ?? 0 })),
        ]}
      />

      {visible.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          {prospects.length === 0
            ? "Todavía no hay prospectos de proveedor. Registra el primero con «Nuevo prospecto»."
            : "Ningún prospecto coincide con los filtros."}
        </p>
      ) : (
        <ExportableTable title="Prospección de proveedores">
          <div className="@container/table w-full overflow-x-auto rounded-md border">
            <table className="w-full min-w-max text-sm md:min-w-0">
              <thead>
                <tr className="bg-primary/[0.07] border-b">
                  <th className={thClass}>Proveedor</th>
                  <th className={cn(thClass, "hidden @3xl/table:table-cell")}>Contacto</th>
                  <th className={thClass}>Etapa</th>
                  <th className={thClass}>Próximo seguimiento</th>
                  <th className={cn(thClass, "hidden @5xl/table:table-cell")}>Responsable</th>
                  <th className={cn(thClass, "hidden @6xl/table:table-cell")}>Cobertura</th>
                  <th className={cn(thClass, "hidden @7xl/table:table-cell")}>Última actividad</th>
                  {(canEdit || canDelete) && <th className="w-24 px-2 py-2" />}
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-muted/40 cursor-pointer border-b align-top last:border-0"
                    onClick={(e) => isRowClick(e) && openSheet(p)}
                  >
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        className="block max-w-56 truncate text-left font-semibold hover:underline"
                        title={p.commercialName}
                        onClick={() => openSheet(p)}
                      >
                        {p.commercialName}
                      </button>
                      {(p.legalName || p.city) && (
                        <span className="text-muted-foreground block max-w-56 truncate text-xs">
                          {[p.legalName && p.legalName !== p.commercialName ? p.legalName : null, p.city].filter(Boolean).join(" · ")}
                        </span>
                      )}
                      {p.onboardingId && <span className="block text-xs text-green-700">Con alta de proveedor</span>}
                    </td>
                    <td className="hidden px-3 py-3 @3xl/table:table-cell">
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
                      {p.website && !p.phone && !p.email && (
                        <span className="text-muted-foreground flex items-center gap-1 text-xs">
                          <Globe className="size-3" />
                          {p.website}
                        </span>
                      )}
                      {!p.contactName && !p.phone && !p.email && !p.website && <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      {canEdit ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger className="focus-visible:ring-ring inline-flex items-center gap-1 rounded-full outline-none focus-visible:ring-2">
                            <StageBadge stage={p.status} stages={PROSPECT_STATUSES} />
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
                        <StageBadge stage={p.status} stages={PROSPECT_STATUSES} />
                      )}
                      {p.status === "descartado" && p.discardReason && (
                        <span className="text-muted-foreground mt-1 block max-w-56 truncate text-xs" title={p.discardReason}>
                          {p.discardReason}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <FollowUpCell nextFollowUpOn={p.nextFollowUpOn} nextAction={p.nextAction} open={isOpenProspectStatus(p.status)} today={today} />
                    </td>
                    <td className="text-muted-foreground hidden px-3 py-3 @5xl/table:table-cell">{p.ownerName ?? "—"}</td>
                    <td className="text-muted-foreground hidden px-3 py-3 whitespace-nowrap @6xl/table:table-cell">
                      {p.coverage ? PROSPECT_COVERAGE_LABELS[p.coverage as keyof typeof PROSPECT_COVERAGE_LABELS] : "—"}
                    </td>
                    <td className="text-muted-foreground hidden px-3 py-3 @7xl/table:table-cell">
                      <LastActivityCell activity={p.lastActivity} />
                    </td>
                    {(canEdit || canDelete) && (
                      <td className="px-2 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && !p.onboardingId && p.status !== "descartado" && (
                            <Button variant="ghost" size="icon" className="size-7" asChild>
                              <Link href={onboardingHref(p.id)} aria-label={`Iniciar alta de ${p.commercialName}`} title="Iniciar alta">
                                <ClipboardCheck className="size-3.5" />
                              </Link>
                            </Button>
                          )}
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="size-7" asChild>
                              <Link href={`${editBase}/${p.id}/edit`} aria-label={`Editar ${p.commercialName}`} title="Editar">
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
                              title="Eliminar"
                              onClick={() => remove(p)}
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
        open={discarding !== null}
        title={`Descartar ${discarding?.commercialName ?? ""}`}
        description="Queda en la lista con el motivo, para saber qué pasó si se vuelve a buscar."
        label="Por qué se descarta"
        hint="Teléfono equivocado, no le interesa, no corre nuestras rutas, documentos incompletos…"
        confirmLabel="Descartar"
        initial={discarding?.discardReason ?? ""}
        onCancel={() => setDiscarding(null)}
        onConfirm={confirmDiscard}
      />

      <ProviderSheet
        target={viewing}
        onClose={() => setViewing(null)}
        onChanged={load}
        dashboardBase={dashboardBase}
        canEditProspect={canEdit}
        canDeleteProspect={canDelete}
      />
    </div>
  );
}
