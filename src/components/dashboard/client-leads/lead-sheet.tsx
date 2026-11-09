"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Handshake, Loader2, Pencil, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ClientPicker } from "@/components/dashboard/resources/client-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSession } from "@/lib/auth-client";
import { cn, formatMxn } from "@/lib/utils";
import { QUOTE_STATUS_CONFIG, getQuoteDisplayStatus } from "@/lib/constants/quote-status";
import { LEAD_SOURCE_LABELS, LEAD_STAGES, isOpenStage, type LeadSource } from "@/lib/client-leads";
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
} from "@/components/dashboard/crm/crm-ui";
import type { LeadDetail } from "./lead-types";
import { useUnitTypeNames } from "@/components/dashboard/crm/unit-type-picker";

/**
 * Ficha de un prospecto de cliente en el panel lateral. Mismo orden que la de
 * proveedores: seguimiento, registrar actividad, historial, contacto, datos,
 * lo propio del módulo (cotizaciones) y notas.
 */
export function LeadSheet({
  leadId,
  onClose,
  onChanged,
  basePath,
  canEdit,
  canDelete,
  converting,
  onConvertingChange,
}: {
  leadId: string | null;
  onClose: () => void;
  /** Para refrescar la tabla tras registrar una actividad o convertir. */
  onChanged: () => void;
  /** /admin/dashboard/client-leads o /collaborator/dashboard/client-leads */
  basePath: string;
  canEdit: boolean;
  canDelete: boolean;
  /** "Convertir en cliente" abierto (desde el renglón o desde la ficha). */
  converting: boolean;
  onConvertingChange: (v: boolean) => void;
}) {
  const { data: session } = useSession();
  const unitTypeNames = useUnitTypeNames();
  const panelBase = basePath.replace(/\/client-leads$/, "");
  const clientsEndpoint = panelBase.startsWith("/admin") ? "/api/admin/clients" : "/api/collaborator/clients";
  const [loaded, setLoaded] = useState<{ id: string; lead: LeadDetail | null } | null>(null);
  const lead = loaded && loaded.id === leadId ? loaded.lead : undefined;

  const load = useCallback(() => {
    if (!leadId) return;
    fetch(`/api/client-leads/${leadId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: LeadDetail | null) => setLoaded({ id: leadId, lead: d }))
      .catch(() => setLoaded({ id: leadId, lead: null }));
  }, [leadId]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = () => {
    load();
    onChanged();
  };

  const today = todayKey();
  const open = lead ? isOpenStage(lead.stage) : false;

  return (
    <>
      <CrmSheet
        open={leadId !== null}
        onClose={onClose}
        loading={lead === undefined}
        title={lead?.companyName ?? ""}
        subtitle={lead ? [lead.industry, lead.city].filter(Boolean).join(" · ") : null}
        badges={
          lead && (
            <>
              <StageBadge stage={lead.stage} stages={LEAD_STAGES} />
              {lead.clientName && (
                <Badge variant="outline" className="border-0 bg-green-100 text-green-800">
                  Cliente: {lead.clientName}
                </Badge>
              )}
            </>
          )
        }
        footer={
          lead &&
          canEdit && (
            <>
              <Button variant="outline" asChild>
                <Link href={`${basePath}/${lead.id}/edit`}>
                  <Pencil className="size-4" />
                  Editar prospecto
                </Link>
              </Button>
              {lead.clientId ? (
                <Button asChild>
                  <Link href={`${panelBase}/clients/${lead.clientId}`}>
                    <Users className="size-4" />
                    Ver cliente
                  </Link>
                </Button>
              ) : (
                lead.stage !== "perdido" && (
                  <Button onClick={() => onConvertingChange(true)}>
                    <Handshake className="size-4" />
                    Convertir en cliente
                  </Button>
                )
              )}
            </>
          )
        }
      >
        {lead === null ? (
          <p className="text-muted-foreground text-sm">No se pudo cargar este prospecto.</p>
        ) : (
          lead && (
            <>
              <NextFollowUpBox nextFollowUpOn={lead.nextFollowUpOn} nextAction={lead.nextAction} open={open} today={today} />

              {canEdit && open && (
                <SheetSection title="Registrar actividad">
                  <ActivityForm
                    key={lead.updatedAt}
                    endpoint={`/api/client-leads/${lead.id}/activities`}
                    nextFollowUpOn={lead.nextFollowUpOn}
                    nextAction={lead.nextAction}
                    onSaved={refresh}
                  />
                </SheetSection>
              )}

              <SheetSection title="Historial">
                <ActivityTimeline
                  activities={lead.activities}
                  endpoint={`/api/client-leads/${lead.id}/activities`}
                  canRemove={(a) => canEdit && (canDelete || a.authorId === session?.user.id)}
                  onChanged={refresh}
                />
              </SheetSection>

              {(lead.contactName || lead.position || lead.phone || lead.email) && (
                <SheetSection title="Contacto">
                  <SheetRows>
                    <SheetRow label="Nombre">{lead.contactName}</SheetRow>
                    <SheetRow label="Puesto">{lead.position}</SheetRow>
                    <SheetRow label="Teléfono">{lead.phone && <PhoneLinks phone={lead.phone} />}</SheetRow>
                    <SheetRow label="Correo">{lead.email && <EmailLink email={lead.email} />}</SheetRow>
                  </SheetRows>
                </SheetSection>
              )}

              <SheetSection title="Datos">
                <SheetRows>
                  <SheetRow label="Responsable">{lead.ownerName ?? "Sin responsable"}</SheetRow>
                  <SheetRow label="Cómo llegó">{lead.source ? LEAD_SOURCE_LABELS[lead.source as LeadSource] : null}</SheetRow>
                  <SheetRow label="Venta mensual">{lead.estimatedMonthly != null ? `$${formatMxn(lead.estimatedMonthly)}` : null}</SheetRow>
                  <SheetRow label="Tipos de unidad">{lead.unitTypes.length > 0 ? unitTypeNames(lead.unitTypes) : null}</SheetRow>
                  <SheetRow label="Ciudad">{lead.city}</SheetRow>
                  <SheetRow label="Giro">{lead.industry}</SheetRow>
                  <SheetRow label="RFC">{lead.rfc}</SheetRow>
                  <SheetRow label="Dirección">{lead.address}</SheetRow>
                  <SheetRow label="Registrado">{`${shortDay(lead.createdAt)}${lead.createdByName ? ` · ${lead.createdByName}` : ""}`}</SheetRow>
                </SheetRows>
              </SheetSection>

              <SheetSection title="Cotizaciones">
                {lead.quotes.length === 0 ? (
                  <p className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-sm">Sin cotizaciones con este nombre.</p>
                ) : (
                  <ul className="divide-y rounded-md border">
                    {lead.quotes.map((q) => {
                      const display = getQuoteDisplayStatus(q.status, q.validUntil);
                      return (
                        <li key={`${q.kind}-${q.id}`} className="flex items-center justify-between gap-3 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate font-mono text-xs font-medium">{q.number}</p>
                            <p className="text-muted-foreground text-xs">
                              {q.kind === "maritima" ? "Marítima" : "Terrestre"} · {shortDay(q.createdAt)}
                              {q.amount != null && ` · $${formatMxn(q.amount)}`}
                            </p>
                          </div>
                          <Badge variant="outline" className={cn("shrink-0 border-0", QUOTE_STATUS_CONFIG[display].badgeClass)}>
                            {QUOTE_STATUS_CONFIG[display].label}
                          </Badge>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </SheetSection>

              {(lead.notes || (lead.stage === "perdido" && lead.lostReason)) && (
                <SheetSection title="Notas">
                  <SheetRows>
                    {lead.stage === "perdido" && <SheetRow label="Por qué se perdió">{lead.lostReason}</SheetRow>}
                    {lead.notes && <p className="px-3 py-2 text-sm whitespace-pre-wrap">{lead.notes}</p>}
                  </SheetRows>
                </SheetSection>
              )}
            </>
          )
        )}
      </CrmSheet>

      {lead && (
        <ConvertDialog
          open={converting}
          lead={lead}
          clientsEndpoint={clientsEndpoint}
          onClose={() => onConvertingChange(false)}
          onDone={() => {
            onConvertingChange(false);
            refresh();
          }}
        />
      )}
    </>
  );
}

function ConvertDialog({
  open,
  lead,
  clientsEndpoint,
  onClose,
  onDone,
}: {
  open: boolean;
  lead: LeadDetail;
  clientsEndpoint: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [linking, setLinking] = useState(false);

  async function convert(clientId?: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/client-leads/${lead.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientId ? { clientId } : {}),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string; code?: string; clientId?: string };
        // Ya estaba en el catálogo: se ofrece ligarlo en un clic.
        if (d.code === "CLIENT_EXISTS" && d.clientId) {
          const existingId = d.clientId;
          toast.error(d.error ?? "Ese cliente ya existe.", { action: { label: "Ligarlo", onClick: () => void convert(existingId) } });
          return;
        }
        throw new Error(d.error ?? "No se pudo convertir.");
      }
      toast.success(clientId ? "Prospecto ligado al cliente." : "Cliente dado de alta.");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo convertir.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Convertir en cliente</DialogTitle>
          <DialogDescription>
            El prospecto queda como ganado y la empresa entra al catálogo de clientes, de donde la toman los cotizadores.
          </DialogDescription>
        </DialogHeader>
        {linking ? (
          <div className="space-y-2">
            <Label>Cliente que ya existe</Label>
            <ClientPicker endpoint={clientsEndpoint} onPick={(c) => convert(c.id)} />
            <p className="text-muted-foreground text-xs">Úsalo si la empresa ya estaba dada de alta como cliente.</p>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <p>
              Se creará el cliente <b>{lead.companyName}</b> con el contacto, puesto, teléfono, correo y notas del prospecto.
              Después puedes completar su RFC, dirección y rutas.
            </p>
            {!lead.canCreateClients && (
              <p className="text-destructive text-xs">No tienes permiso para crear clientes. Puedes ligarlo a uno que ya exista.</p>
            )}
          </div>
        )}
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={() => setLinking((v) => !v)} disabled={busy}>
            <Users className="size-4" />
            {linking ? "Mejor crear uno nuevo" : "Ya existe como cliente"}
          </Button>
          {!linking && (
            <Button onClick={() => convert()} disabled={busy || !lead.canCreateClients}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Dar de alta como cliente
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
