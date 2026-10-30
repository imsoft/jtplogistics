"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarClock,
  ChevronLeft,
  FileText,
  Handshake,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  NotebookPen,
  Pencil,
  Phone,
  Trash2,
  Users,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppSelect } from "@/components/ui/app-select";
import { ResourceDetailSkeleton } from "@/components/ui/skeletons";
import { InfoRow } from "@/components/dashboard/users/info-row";
import { ClientPicker } from "@/components/dashboard/resources/client-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, formatMxn, formatPhone } from "@/lib/utils";
import { QUOTE_STATUS_CONFIG, getQuoteDisplayStatus } from "@/lib/constants/quote-status";
import {
  LEAD_ACTIVITY_LABELS,
  LEAD_ACTIVITY_TYPES,
  LEAD_SOURCE_LABELS,
  type LeadActivityType,
  type LeadSource,
} from "@/lib/client-leads";
import { FollowUpCell, StageBadge } from "./leads-table";
import { shortDay, todayKey, type LeadDetail } from "./lead-types";
import { DatePicker } from "@/components/ui/date-picker";
import { useConfirm } from "@/components/ui/confirm-provider";

const ACTIVITY_ICONS: Record<LeadActivityType, React.ElementType> = {
  llamada: Phone,
  correo: Mail,
  whatsapp: MessageCircle,
  reunion: Video,
  visita: MapPin,
  cotizacion: FileText,
  nota: NotebookPen,
};

/**
 * Ficha de un prospecto de cliente: datos, próximo seguimiento, historial de
 * actividades, cotizaciones hechas a la empresa y alta como cliente.
 */
export function LeadDetailView({
  basePath,
  panelBase,
  clientsEndpoint,
  canEdit,
  canDelete,
  currentUserId,
}: {
  /** p. ej. /admin/dashboard/client-leads */
  basePath: string;
  /** p. ej. /admin/dashboard, para ligar a clientes y cotizaciones */
  panelBase: string;
  clientsEndpoint: string;
  canEdit: boolean;
  canDelete: boolean;
  currentUserId: string | null;
}) {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/client-leads/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "Este prospecto ya no existe." : "No se pudo cargar el prospecto.");
        return r.json();
      })
      .then((d: LeadDetail) => setLead(d))
      .catch((e: Error) => setError(e.message));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <p className="text-destructive py-6 text-sm">{error}</p>;
  if (!lead) return <ResourceDetailSkeleton />;

  const today = todayKey();

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href={basePath} aria-label="Volver al CRM">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="page-heading truncate">{lead.companyName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StageBadge stage={lead.stage} />
              {lead.clientId && (
                <Link href={`${panelBase}/clients/${lead.clientId}`} className="text-xs text-green-700 hover:underline">
                  Ya es cliente: {lead.clientName}
                </Link>
              )}
            </div>
          </div>
        </div>
        {canEdit && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {!lead.clientId && lead.stage !== "perdido" && (
              <Button variant="outline" onClick={() => setConverting(true)}>
                <Handshake className="size-4" />
                Convertir en cliente
              </Button>
            )}
            <Button asChild>
              <Link href={`${basePath}/${lead.id}/edit`}>
                <Pencil className="size-4" />
                Editar
              </Link>
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          {canEdit && lead.stage !== "ganado" && lead.stage !== "perdido" && (
            <ActivityForm lead={lead} onSaved={load} />
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historial</CardTitle>
              <CardDescription>Lo que se ha hecho con este prospecto, lo más reciente primero.</CardDescription>
            </CardHeader>
            <CardContent>
              {lead.activities.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                  Todavía no hay actividades registradas.
                </p>
              ) : (
                <ol className="space-y-4">
                  {lead.activities.map((a) => {
                    const Icon = ACTIVITY_ICONS[a.type];
                    const canRemove = canEdit && (a.authorId === currentUserId || canDelete);
                    return (
                      <li key={a.id} className="flex gap-3">
                        <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full">
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 text-xs">
                            <span className="font-semibold">{LEAD_ACTIVITY_LABELS[a.type]}</span>
                            <span className="text-muted-foreground">{shortDay(a.occurredOn)}</span>
                            {a.authorName && <span className="text-muted-foreground">· {a.authorName}</span>}
                          </div>
                          <p className="mt-0.5 text-sm whitespace-pre-wrap">{a.summary}</p>
                        </div>
                        {canRemove && (
                          <DeleteActivityButton leadId={lead.id} activityId={a.id} onDeleted={load} />
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="size-4" />
                Próximo seguimiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FollowUpCell lead={lead} today={today} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Datos</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <InfoRow label="Contacto" value={lead.contactName} />
              <InfoRow label="Puesto" value={lead.position} />
              <InfoRow label="Teléfono" value={lead.phone ? formatPhone(lead.phone) : null} />
              <InfoRow label="Correo" value={lead.email} isEmail />
              <InfoRow label="Ciudad" value={lead.city} />
              <InfoRow label="Giro" value={lead.industry} />
              <InfoRow label="RFC" value={lead.rfc} />
              <InfoRow label="Dirección" value={lead.address} />
              <InfoRow label="Cómo llegó" value={lead.source ? LEAD_SOURCE_LABELS[lead.source as LeadSource] : null} />
              <InfoRow label="Responsable" value={lead.ownerName} />
              <InfoRow
                label="Venta mensual"
                value={lead.estimatedMonthly != null ? `$${formatMxn(lead.estimatedMonthly)}` : null}
              />
              <InfoRow label="Registrado" value={`${shortDay(lead.createdAt.slice(0, 10))}${lead.createdByName ? ` · ${lead.createdByName}` : ""}`} />
            </CardContent>
          </Card>

          {(lead.notes || (lead.stage === "perdido" && lead.lostReason)) && (
            <Card>
              <CardContent className="space-y-4 p-4">
                {lead.stage === "perdido" && lead.lostReason && (
                  <div>
                    <h3 className="text-muted-foreground mb-1 text-sm font-semibold tracking-wider uppercase">Por qué se perdió</h3>
                    <p className="text-sm whitespace-pre-wrap">{lead.lostReason}</p>
                  </div>
                )}
                {lead.notes && (
                  <div>
                    <h3 className="text-muted-foreground mb-1 text-sm font-semibold tracking-wider uppercase">Notas</h3>
                    <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Cotizaciones</CardTitle>
              <CardDescription>Las hechas a esta empresa con el mismo nombre.</CardDescription>
            </CardHeader>
            <CardContent>
              {lead.quotes.length === 0 ? (
                <p className="text-muted-foreground text-sm">Sin cotizaciones todavía.</p>
              ) : (
                <ul className="divide-y">
                  {lead.quotes.map((q) => {
                    const display = getQuoteDisplayStatus(q.status, q.validUntil);
                    return (
                      <li key={`${q.kind}-${q.id}`} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-xs font-medium">{q.number}</p>
                          <p className="text-muted-foreground text-xs">
                            {q.kind === "maritima" ? "Marítima" : "Terrestre"} · {shortDay(q.createdAt.slice(0, 10))}
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
            </CardContent>
          </Card>
        </div>
      </div>

      <ConvertDialog
        open={converting}
        lead={lead}
        clientsEndpoint={clientsEndpoint}
        onClose={() => setConverting(false)}
        onDone={() => {
          setConverting(false);
          load();
        }}
      />
    </div>
  );
}

function ActivityForm({ lead, onSaved }: { lead: LeadDetail; onSaved: () => void }) {
  const today = todayKey();
  const [type, setType] = useState<string>("llamada");
  const [occurredOn, setOccurredOn] = useState(today);
  const [summary, setSummary] = useState("");
  // Una fecha ya pasada no sirve como próximo seguimiento (y el navegador no
  // dejaría guardar): se propone vacía para que se elija una nueva.
  const [nextFollowUpOn, setNextFollowUpOn] = useState(
    lead.nextFollowUpOn && lead.nextFollowUpOn >= today ? lead.nextFollowUpOn : ""
  );
  const [nextAction, setNextAction] = useState(lead.nextAction ?? "");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (summary.trim().length < 3) return toast.error("Escribe qué pasó.");
    setBusy(true);
    try {
      const res = await fetch(`/api/client-leads/${lead.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          occurredOn,
          summary: summary.trim(),
          nextFollowUpOn: nextFollowUpOn || null,
          nextAction: nextAction.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "No se pudo guardar.");
      }
      toast.success("Actividad registrada.");
      setSummary("");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Registrar actividad</CardTitle>
        <CardDescription>Lo que se hizo y, de una vez, cuándo toca el siguiente paso.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Qué se hizo</Label>
              <AppSelect
                value={type}
                onValueChange={(v) => setType(v || "llamada")}
                options={LEAD_ACTIVITY_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="activity-date">Fecha</Label>
              <DatePicker id="activity-date" max={today} value={occurredOn} onChange={(v) => setOccurredOn(v)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="activity-summary">Qué pasó</Label>
            <Textarea id="activity-summary" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
            <p className="text-muted-foreground text-xs">Con quién hablaste, qué necesita, qué quedó pendiente.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
            <div className="space-y-2">
              <Label htmlFor="activity-next-date">Próximo seguimiento</Label>
              <DatePicker id="activity-next-date" min={today} value={nextFollowUpOn} onChange={(v) => setNextFollowUpOn(v)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="activity-next-action">Qué toca hacer</Label>
              <Input id="activity-next-action" value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Guardar actividad
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function DeleteActivityButton({ leadId, activityId, onDeleted }: { leadId: string; activityId: string; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 shrink-0"
      aria-label="Borrar actividad"
      disabled={busy}
      onClick={async () => {
        if (
          !(await confirm({
            title: "¿Borrar la actividad?",
            description: "Desaparece del historial del prospecto y no se puede recuperar.",
            confirmLabel: "Borrar",
            destructive: true,
          }))
        )
          return;
        setBusy(true);
        try {
          const res = await fetch(`/api/client-leads/${leadId}/activities/${activityId}`, { method: "DELETE" });
          if (!res.ok) throw new Error();
          toast.success("Actividad borrada.");
          onDeleted();
        } catch {
          toast.error("No se pudo borrar.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Trash2 className="text-destructive size-3.5" />
    </Button>
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
              Se creará el cliente <b>{lead.companyName}</b> con el contacto, puesto, teléfono, correo y notas del
              prospecto. Después puedes completar su RFC, dirección y rutas.
            </p>
            {!lead.canCreateClients && (
              <p className="text-destructive text-xs">
                No tienes permiso para crear clientes. Puedes ligarlo a uno que ya exista.
              </p>
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
