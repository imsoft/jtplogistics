"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ClipboardCheck, Globe, Mail, Minus, Pencil, Phone, UserRound } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatPhone } from "@/lib/utils";
import {
  PROSPECT_COVERAGE_LABELS,
  PROSPECT_SOURCE_LABELS,
  PROSPECT_STATUSES,
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

/** Clic en el renglón abre la ficha, salvo que se haya dado en un botón, enlace o menú del renglón. */
export function isRowClick(e: React.MouseEvent) {
  return !(e.target as HTMLElement).closest("a,button,input,select,textarea,label,[role=menuitem],[role=menu]");
}

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
  createdByName: string | null;
  onboardingId: string | null;
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

const STATUS_BY_VALUE = Object.fromEntries(PROSPECT_STATUSES.map((s) => [s.value, s]));
const STAGE_TONE = { in_progress: "bg-blue-100 text-blue-800", complete: "bg-green-100 text-green-800", on_hold: "bg-gray-200 text-gray-800" } as const;

function day(iso: string | null) {
  if (!iso) return null;
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** null = sin permiso o no existe: esa sección no se muestra. */
async function getJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-primary text-xs font-semibold uppercase tracking-wider">{title}</h3>
      <dl className="bg-muted/40 divide-y rounded-md border text-sm">{children}</dl>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div className="flex items-start justify-between gap-4 px-3 py-2">
      <dt className="text-muted-foreground shrink-0 text-xs">{label}</dt>
      <dd className="min-w-0 text-right font-medium break-words">{children}</dd>
    </div>
  );
}

/**
 * Ficha del proveedor, la misma en Prospección y en Alta de proveedores: sus
 * datos de contacto y de prospección y, si ya tiene alta, el avance del
 * expediente, el contrato y la cuenta. Lo que el usuario no tiene permiso de
 * ver simplemente no aparece.
 */
export function ProviderSheet({
  target,
  onClose,
  dashboardBase,
  canEditProspect = false,
  canEditOnboarding = false,
}: {
  target: ProviderSheetTarget | null;
  onClose: () => void;
  /** /admin/dashboard o /collaborator/dashboard */
  dashboardBase: string;
  canEditProspect?: boolean;
  canEditOnboarding?: boolean;
}) {
  // Se guarda junto con el proveedor que se pidió: si no coincide, aún se está cargando.
  const [loaded, setLoaded] = useState<{ for: ProviderSheetTarget; prospect: ProspectData | null; onboarding: OnboardingData | null } | null>(null);
  const data = loaded && loaded.for === target ? loaded : null;
  const panel = dashboardBase.startsWith("/admin") ? "admin" : "collaborator";

  useEffect(() => {
    if (!target) return;
    let alive = true;
    (async () => {
      let prospect = target.prospectId ? await getJson<ProspectData>(`/api/provider-prospects/${target.prospectId}`) : null;
      const onboardingId = target.onboardingId ?? prospect?.onboardingId ?? null;
      const onboarding = onboardingId ? await getJson<OnboardingData>(`/api/provider-onboardings/${onboardingId}`) : null;
      if (!prospect && onboarding?.prospectId) prospect = await getJson<ProspectData>(`/api/provider-prospects/${onboarding.prospectId}`);
      if (alive) setLoaded({ for: target, prospect, onboarding });
    })();
    return () => {
      alive = false;
    };
  }, [target]);

  const p = data?.prospect ?? null;
  const o = data?.onboarding ?? null;
  const title = o?.commercialName ?? p?.commercialName ?? target?.name ?? "";
  const legal = o?.legalName ?? p?.legalName ?? null;
  const status = p ? STATUS_BY_VALUE[p.status] : null;
  const stage = o ? onboardingStage(o) : null;
  const progress = o ? docProgress(o.docs) : null;
  const email = p?.email ?? o?.email ?? null;

  return (
    <Sheet open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b pr-10">
          <SheetTitle className="text-lg">{title}</SheetTitle>
          <SheetDescription className={cn(!legal && "sr-only")}>{legal || "Ficha del proveedor"}</SheetDescription>
          {data && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {status && (
                <Badge variant="outline" className={cn("border-0", status.badgeClass)}>
                  {status.label}
                </Badge>
              )}
              {stage && (
                <Badge variant="outline" className={cn("border-0", STAGE_TONE[stage])}>
                  Alta: {STAGE_LABELS[stage]}
                </Badge>
              )}
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          {!data ? (
            <div className="space-y-5" aria-hidden>
              {[3, 4, 5].map((n) => (
                <div key={n} className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <div className="space-y-2 rounded-md border p-3">
                    {Array.from({ length: n }, (_, i) => (
                      <Skeleton key={i} className="h-4 w-full" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : !p && !o ? (
            <p className="text-muted-foreground text-sm">No se pudo cargar la información de este proveedor.</p>
          ) : (
            <>
              {(p?.contactName || p?.phone || email || p?.website) && (
                <Section title="Contacto">
                  <Row label="Nombre">{p?.contactName}</Row>
                  <Row label="Teléfono">
                    {p?.phone && (
                      <a href={`tel:${p.phone}`} className="text-primary inline-flex items-center gap-1 hover:underline">
                        <Phone className="size-3" aria-hidden />
                        {formatPhone(p.phone)}
                      </a>
                    )}
                  </Row>
                  <Row label="Correo">
                    {email && (
                      <a href={`mailto:${email}`} className="text-primary text-email break-all hover:underline">
                        <Mail className="mr-1 inline size-3 align-[-1px]" aria-hidden />
                        {email}
                      </a>
                    )}
                  </Row>
                  <Row label="Sitio web">
                    {p?.website && (
                      <span className="inline-flex items-center gap-1">
                        <Globe className="size-3" aria-hidden />
                        {p.website}
                      </span>
                    )}
                  </Row>
                </Section>
              )}

              {p && (
                <Section title="Prospección">
                  <Row label="Etapa">{status?.label}</Row>
                  <Row label="Ciudad">{p.city}</Row>
                  <Row label="Cómo se consiguió">{p.source ? PROSPECT_SOURCE_LABELS[p.source as keyof typeof PROSPECT_SOURCE_LABELS] : null}</Row>
                  <Row label="Cobertura">{p.coverage ? PROSPECT_COVERAGE_LABELS[p.coverage as keyof typeof PROSPECT_COVERAGE_LABELS] : null}</Row>
                  <Row label="Contacto el">{day(p.contactedOn)}</Row>
                  <Row label="Capturó">{p.createdByName}</Row>
                  {p.status === "descartado" && <Row label="Motivo del descarte">{p.discardReason}</Row>}
                </Section>
              )}

              {o && progress && (
                <Section title="Alta">
                  <Row label="Inicio">{day(o.startedOn)}</Row>
                  <Row label="Expediente">
                    {progress.done} de {progress.total}
                  </Row>
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
                  <Row label="Completo el">{day(o.completedOn)}</Row>
                  <Row label="Autorizó el alta">{o.altaAuthorizedBy}</Row>
                  <Row label="Contrato">{CONTRACT_STATUS_LABELS[o.contractStatus]}</Row>
                  <Row label="Autorizó el contrato">{o.contractAuthorizedBy}</Row>
                  <Row label="RFC">{o.rfc}</Row>
                  {stage === "on_hold" && <Row label="Detenido">{o.holdReason}</Row>}
                  <Row label="Cuenta">
                    {o.userId ? (
                      <Link href={providerProfileHref(panel, o.userId)} className="text-primary inline-flex items-center gap-1 hover:underline">
                        <UserRound className="size-3" aria-hidden />
                        Ver perfil del proveedor
                      </Link>
                    ) : (
                      "Sin cuenta"
                    )}
                  </Row>
                </Section>
              )}

              {(p?.notes || o?.notes || o?.purchasingNotes) && (
                <Section title="Notas">
                  <Row label="Prospección">{p?.notes}</Row>
                  <Row label="Alta">{o?.notes}</Row>
                  <Row label="Compras">{o?.purchasingNotes}</Row>
                </Section>
              )}
            </>
          )}
        </div>

        {data && ((canEditProspect && p) || (canEditOnboarding && o)) && (
          <SheetFooter className="flex-row flex-wrap justify-end border-t">
            {canEditProspect && p && (
              <Button variant="outline" asChild>
                <Link href={`${dashboardBase}/prospects/${p.id}/edit`}>
                  <Pencil className="size-4" />
                  Editar prospecto
                </Link>
              </Button>
            )}
            {canEditOnboarding && o && (
              <Button asChild>
                <Link href={`${dashboardBase}/provider-onboardings/${o.id}/edit`}>
                  <ClipboardCheck className="size-4" />
                  Editar alta
                </Link>
              </Button>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
