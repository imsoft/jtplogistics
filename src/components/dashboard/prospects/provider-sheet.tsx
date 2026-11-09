"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, ClipboardCheck, Globe, Minus, Pencil, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  PROSPECT_COVERAGE_LABELS,
  PROSPECT_SOURCE_LABELS,
  PROSPECT_STATUSES,
  isOpenProspectStatus,
  type ProspectStatus,
} from "@/lib/provider-prospects";
import {
  CONTRACT_STATUS_LABELS,
  ONBOARDING_DOCS,
  STAGE_LABELS,
  docProgress,
  onboardingStage,
  type ContractStatus,
  type DocRecord,
} from "@/lib/provider-onboardings";
import { providerProfileHref } from "@/lib/provider-onboarding-account";
import {
  ActivityForm,
  ActivityTimeline,
  CrmSheet,
  EmailLink,
  NextFollowUpBox,
  PhoneLinks,
  SheetRow,
  SheetRows,
  SheetSection,
  StageBadge,
  shortDay,
  todayKey,
  type CrmActivity,
} from "@/components/dashboard/crm/crm-ui";

export { isRowClick } from "@/components/dashboard/crm/crm-ui";

/** Proveedor a mostrar: basta con uno de los dos ids; el otro se resuelve solo. */
export interface ProviderSheetTarget {
  prospectId: string | null;
  onboardingId: string | null;
  name: string;
}

interface ProspectData {
  id: string;
  commercialName: string;
  legalName: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  source: string | null;
  coverage: string | null;
  status: ProspectStatus;
  city: string | null;
  contactedOn: string | null;
  notes: string | null;
  discardReason: string | null;
  nextAction: string | null;
  nextFollowUpOn: string | null;
  ownerName: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  onboardingId: string | null;
  activities: CrmActivity[];
}

interface OnboardingData {
  id: string;
  legalName: string;
  commercialName: string;
  prospectId: string | null;
  email: string | null;
  rfc: string | null;
  userId: string | null;
  startedOn: string;
  docs: DocRecord;
  completedOn: string | null;
  altaAuthorizedBy: string | null;
  contractStatus: ContractStatus;
  contractAuthorizedBy: string | null;
  notes: string | null;
  purchasingNotes: string | null;
  onHoldSince: string | null;
  holdReason: string | null;
}

const STAGE_TONE = { in_progress: "bg-blue-100 text-blue-800", complete: "bg-green-100 text-green-800", on_hold: "bg-gray-200 text-gray-800" } as const;

/** null = sin permiso o no existe: esa sección no se muestra. */
async function getJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

/** El prospecto y su alta; si se pidió por el alta, el prospecto se resuelve de ella. */
async function fetchProvider(target: ProviderSheetTarget) {
  let prospect = target.prospectId ? await getJson<ProspectData>(`/api/provider-prospects/${target.prospectId}`) : null;
  const onboardingId = target.onboardingId ?? prospect?.onboardingId ?? null;
  const onboarding = onboardingId ? await getJson<OnboardingData>(`/api/provider-onboardings/${onboardingId}`) : null;
  if (!prospect && onboarding?.prospectId) prospect = await getJson<ProspectData>(`/api/provider-prospects/${onboarding.prospectId}`);
  return { prospect, onboarding };
}

/**
 * Ficha del proveedor en el panel lateral, la misma en Prospección y en Alta
 * de proveedores. Mismo orden que la de clientes: seguimiento, registrar
 * actividad, historial, contacto, datos, lo propio del módulo (el alta) y
 * notas. Lo que el usuario no tiene permiso de ver no aparece.
 */
export function ProviderSheet({
  target,
  onClose,
  onChanged,
  dashboardBase,
  canEditProspect = false,
  canDeleteProspect = false,
  canEditOnboarding = false,
}: {
  target: ProviderSheetTarget | null;
  onClose: () => void;
  /** Para refrescar la tabla tras registrar una actividad. */
  onChanged?: () => void;
  /** /admin/dashboard o /collaborator/dashboard */
  dashboardBase: string;
  canEditProspect?: boolean;
  canDeleteProspect?: boolean;
  canEditOnboarding?: boolean;
}) {
  const { data: session } = useSession();
  const panel = dashboardBase.startsWith("/admin") ? "admin" : "collaborator";
  // Se guarda junto con el proveedor que se pidió: si no coincide, aún se está cargando.
  const [loaded, setLoaded] = useState<{ for: ProviderSheetTarget; prospect: ProspectData | null; onboarding: OnboardingData | null } | null>(null);
  const data = loaded && loaded.for === target ? loaded : null;

  const load = useCallback(() => {
    if (!target) return;
    void fetchProvider(target).then((d) => setLoaded({ for: target, ...d }));
  }, [target]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = () => {
    load();
    onChanged?.();
  };

  const p = data?.prospect ?? null;
  const o = data?.onboarding ?? null;
  const today = todayKey();
  const open = p ? isOpenProspectStatus(p.status) : false;
  const stage = o ? onboardingStage(o) : null;
  const progress = o ? docProgress(o.docs) : null;
  const email = p?.email ?? o?.email ?? null;
  const activitiesEndpoint = p ? `/api/provider-prospects/${p.id}/activities` : "";

  return (
    <CrmSheet
      open={target !== null}
      onClose={onClose}
      loading={!data}
      title={o?.commercialName ?? p?.commercialName ?? target?.name ?? ""}
      subtitle={o?.legalName ?? p?.legalName ?? null}
      badges={
        <>
          {p && <StageBadge stage={p.status} stages={PROSPECT_STATUSES} />}
          {stage && (
            <Badge variant="outline" className={cn("border-0", STAGE_TONE[stage])}>
              Alta: {STAGE_LABELS[stage]}
            </Badge>
          )}
        </>
      }
      footer={
        ((canEditProspect && p) || (canEditOnboarding && o)) && (
          <>
            {canEditProspect && p && (
              <Button variant="outline" asChild>
                <Link href={`${dashboardBase}/prospects/${p.id}/edit`}>
                  <Pencil className="size-4" />
                  Editar prospecto
                </Link>
              </Button>
            )}
            {o
              ? canEditOnboarding && (
                  <Button asChild>
                    <Link href={`${dashboardBase}/provider-onboardings/${o.id}/edit`}>
                      <ClipboardCheck className="size-4" />
                      Editar alta
                    </Link>
                  </Button>
                )
              : canEditProspect &&
                p &&
                !p.onboardingId &&
                p.status !== "descartado" && (
                  <Button asChild>
                    <Link href={`${dashboardBase}/provider-onboardings/new?prospectId=${p.id}`}>
                      <ClipboardCheck className="size-4" />
                      Iniciar alta
                    </Link>
                  </Button>
                )}
          </>
        )
      }
    >
      {!p && !o ? (
        <p className="text-muted-foreground text-sm">No se pudo cargar la información de este proveedor.</p>
      ) : (
        <>
          {p && <NextFollowUpBox nextFollowUpOn={p.nextFollowUpOn} nextAction={p.nextAction} open={open} today={today} />}

          {p && canEditProspect && open && (
            <SheetSection title="Registrar actividad">
              <ActivityForm
                key={p.updatedAt}
                endpoint={activitiesEndpoint}
                nextFollowUpOn={p.nextFollowUpOn}
                nextAction={p.nextAction}
                onSaved={refresh}
              />
            </SheetSection>
          )}

          {p && (
            <SheetSection title="Historial">
              <ActivityTimeline
                activities={p.activities}
                endpoint={activitiesEndpoint}
                canRemove={(a) => canEditProspect && (canDeleteProspect || a.authorId === session?.user.id)}
                onChanged={refresh}
              />
            </SheetSection>
          )}

          {(p?.contactName || p?.phone || email || p?.website) && (
            <SheetSection title="Contacto">
              <SheetRows>
                <SheetRow label="Nombre">{p?.contactName}</SheetRow>
                <SheetRow label="Teléfono">{p?.phone && <PhoneLinks phone={p.phone} />}</SheetRow>
                <SheetRow label="Correo">{email && <EmailLink email={email} />}</SheetRow>
                <SheetRow label="Sitio web">
                  {p?.website && (
                    <span className="inline-flex items-center gap-1 break-all">
                      <Globe className="size-3 shrink-0" aria-hidden />
                      {p.website}
                    </span>
                  )}
                </SheetRow>
              </SheetRows>
            </SheetSection>
          )}

          {p && (
            <SheetSection title="Datos">
              <SheetRows>
                <SheetRow label="Responsable">{p.ownerName ?? "Sin responsable"}</SheetRow>
                <SheetRow label="Cómo se consiguió">{p.source ? PROSPECT_SOURCE_LABELS[p.source as keyof typeof PROSPECT_SOURCE_LABELS] : null}</SheetRow>
                <SheetRow label="Cobertura">{p.coverage ? PROSPECT_COVERAGE_LABELS[p.coverage as keyof typeof PROSPECT_COVERAGE_LABELS] : null}</SheetRow>
                <SheetRow label="Ciudad">{p.city}</SheetRow>
                <SheetRow label="Contacto el">{p.contactedOn ? shortDay(p.contactedOn) : null}</SheetRow>
                <SheetRow label="Registrado">{`${shortDay(p.createdAt)}${p.createdByName ? ` · ${p.createdByName}` : ""}`}</SheetRow>
              </SheetRows>
            </SheetSection>
          )}

          {o && progress && (
            <SheetSection title="Alta">
              <SheetRows>
                <SheetRow label="Inicio">{shortDay(o.startedOn)}</SheetRow>
                <SheetRow label="Expediente">
                  {progress.done} de {progress.total}
                </SheetRow>
                <div className="grid grid-cols-1 gap-1 px-3 py-2 sm:grid-cols-2">
                  {ONBOARDING_DOCS.map((d) => {
                    const st = o.docs[d.key];
                    return (
                      <span key={d.key} className={cn("flex items-center gap-1.5 text-xs", st === "pending" && "text-muted-foreground")}>
                        {st === "received" ? (
                          <Check className="size-3.5 shrink-0 text-green-600" aria-label="Recibido" />
                        ) : st === "not_applicable" ? (
                          <Minus className="text-muted-foreground size-3.5 shrink-0" aria-label="No aplica" />
                        ) : (
                          <span className="border-muted-foreground size-3.5 shrink-0 rounded-full border border-dashed" aria-label="Pendiente" />
                        )}
                        {d.label}
                      </span>
                    );
                  })}
                </div>
                <SheetRow label="Completo el">{o.completedOn ? shortDay(o.completedOn) : null}</SheetRow>
                <SheetRow label="Autorizó el alta">{o.altaAuthorizedBy}</SheetRow>
                <SheetRow label="Contrato">{CONTRACT_STATUS_LABELS[o.contractStatus]}</SheetRow>
                <SheetRow label="Autorizó el contrato">{o.contractAuthorizedBy}</SheetRow>
                <SheetRow label="RFC">{o.rfc}</SheetRow>
                {stage === "on_hold" && <SheetRow label="Detenido">{o.holdReason}</SheetRow>}
                <SheetRow label="Cuenta">
                  {o.userId ? (
                    <Link href={providerProfileHref(panel, o.userId)} className="text-primary inline-flex items-center gap-1 hover:underline">
                      <UserRound className="size-3" aria-hidden />
                      Ver perfil del proveedor
                    </Link>
                  ) : (
                    "Sin cuenta"
                  )}
                </SheetRow>
              </SheetRows>
            </SheetSection>
          )}

          {(p?.notes || (p?.status === "descartado" && p.discardReason) || o?.notes || o?.purchasingNotes) && (
            <SheetSection title="Notas">
              <SheetRows>
                {p?.status === "descartado" && <SheetRow label="Por qué se descartó">{p.discardReason}</SheetRow>}
                {p?.notes && <p className="px-3 py-2 text-sm whitespace-pre-wrap">{p.notes}</p>}
                <SheetRow label="Alta">{o?.notes}</SheetRow>
                <SheetRow label="Compras">{o?.purchasingNotes}</SheetRow>
              </SheetRows>
            </SheetSection>
          )}
        </>
      )}
    </CrmSheet>
  );
}
