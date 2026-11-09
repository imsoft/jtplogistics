"use client";

/**
 * Piezas que comparten Prospección de clientes y Prospección de proveedores,
 * para que las dos pantallas funcionen y se vean exactamente igual: tarjetas
 * de resumen, filtros, celda de seguimiento, historial de actividades,
 * registrar actividad, y el armazón del panel lateral (la ficha).
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  FileText,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  NotebookPen,
  Phone,
  Trash2,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { AppSelect } from "@/components/ui/app-select";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useConfirm } from "@/components/ui/confirm-provider";
import { cn, formatPhone } from "@/lib/utils";
import { LEAD_ACTIVITY_LABELS, LEAD_ACTIVITY_TYPES, type LeadActivityType } from "@/lib/client-leads";
import { followUpStateFor } from "@/lib/crm";

// ── Fechas ──────────────────────────────────────────────────────────────

/** "YYYY-MM-DD" → "22 oct 26", sin que la zona del navegador mueva el día. */
export function shortDay(iso: string) {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

/** Hoy en la zona de la empresa, "YYYY-MM-DD". */
export function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// ── Tipos compartidos ───────────────────────────────────────────────────

export interface CrmActivity {
  id: string;
  type: LeadActivityType;
  summary: string;
  occurredOn: string;
  authorId: string | null;
  authorName: string | null;
  createdAt: string;
}

export interface CrmLastActivity {
  type: LeadActivityType;
  occurredOn: string;
  summary: string;
}

export interface StageOption {
  value: string;
  label: string;
  badgeClass: string;
}

// ── Etapa y seguimiento ─────────────────────────────────────────────────

export function StageBadge({ stage, stages }: { stage: string; stages: StageOption[] }) {
  const cfg = stages.find((s) => s.value === stage);
  if (!cfg) return null;
  return (
    <Badge variant="outline" className={cn("border-0 whitespace-nowrap", cfg.badgeClass)}>
      {cfg.label}
    </Badge>
  );
}

/** Próximo seguimiento con su estado en palabras, no solo en color. */
export function FollowUpCell({
  nextFollowUpOn,
  nextAction,
  open,
  today,
}: {
  nextFollowUpOn: string | null;
  nextAction: string | null;
  open: boolean;
  today: string;
}) {
  const state = followUpStateFor(nextFollowUpOn, today, open);
  if (!nextFollowUpOn || !open) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="space-y-0.5">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 whitespace-nowrap text-sm",
          state === "vencido" && "text-destructive font-semibold",
          state === "hoy" && "font-semibold text-amber-700"
        )}
      >
        {shortDay(nextFollowUpOn)}
        {state === "vencido" && <span className="text-xs">· vencido</span>}
        {state === "hoy" && <span className="text-xs">· hoy</span>}
      </span>
      {nextAction && (
        <span className="text-muted-foreground block max-w-56 truncate text-xs" title={nextAction}>
          {nextAction}
        </span>
      )}
    </div>
  );
}

export function LastActivityCell({ activity }: { activity: CrmLastActivity | null }) {
  if (!activity) return <>—</>;
  return (
    <>
      <span className="block text-xs whitespace-nowrap">
        {LEAD_ACTIVITY_LABELS[activity.type]} · {shortDay(activity.occurredOn)}
      </span>
      <span className="block max-w-56 truncate text-xs" title={activity.summary}>
        {activity.summary}
      </span>
    </>
  );
}

// ── Resumen y filtros ───────────────────────────────────────────────────

export interface SummaryCard {
  label: string;
  value: string | number;
  hint?: string;
  /** Resalta en rojo cuando hay algo que atender. */
  alert?: boolean;
  onClick?: () => void;
}

export function SummaryCards({ cards }: { cards: SummaryCard[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {cards.map((c) => {
        const card = (
          <Card className={cn("h-full py-0", c.onClick && "hover:bg-muted/40 transition-colors", c.alert && "border-destructive/40")}>
            <CardContent className="p-4">
              <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">{c.label}</p>
              <p className={cn("mt-1 text-2xl font-bold", c.alert && "text-destructive")}>{c.value}</p>
              {c.hint && <p className="text-muted-foreground text-xs">{c.hint}</p>}
            </CardContent>
          </Card>
        );
        return c.onClick ? (
          <button key={c.label} type="button" onClick={c.onClick} className="text-left" aria-label={`Filtrar: ${c.label}`}>
            {card}
          </button>
        ) : (
          <div key={c.label}>{card}</div>
        );
      })}
    </div>
  );
}

export const ALL_OWNERS = "all";

export function CrmFilters({
  searchId,
  search,
  onSearch,
  owner,
  onOwner,
  owners,
  chips,
  filter,
  onFilter,
}: {
  searchId: string;
  search: string;
  onSearch: (v: string) => void;
  owner: string;
  onOwner: (v: string) => void;
  owners: { value: string; label: string }[];
  chips: { value: string; label: string; count: number }[];
  filter: string;
  onFilter: (v: string) => void;
}) {
  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full space-y-1.5 sm:max-w-sm">
          <Label htmlFor={searchId}>Buscar</Label>
          <Input id={searchId} value={search} onChange={(e) => onSearch(e.target.value)} />
        </div>
        <div className="w-full space-y-1.5 sm:w-64">
          <Label>Responsable</Label>
          <AppSelect
            value={owner}
            onValueChange={(v) => onOwner(v || ALL_OWNERS)}
            options={[{ value: ALL_OWNERS, label: "Todos" }, ...owners]}
            className="w-full"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <Button
            key={c.value}
            type="button"
            variant={filter === c.value ? "secondary" : "outline"}
            size="sm"
            onClick={() => onFilter(c.value)}
          >
            {c.label} ({c.count})
          </Button>
        ))}
      </div>
    </>
  );
}

export function CrmTableSkeleton() {
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

/** Encabezado de columna, igual en las dos tablas. */
export const thClass = "text-primary px-3 py-2.5 text-left text-xs font-semibold tracking-wide uppercase";

/** Clic en el renglón abre la ficha, salvo que se haya dado en un botón, enlace o menú del renglón. */
export function isRowClick(e: React.MouseEvent) {
  return !(e.target as HTMLElement).closest("a,button,input,select,textarea,label,[role=menuitem],[role=menu]");
}

/**
 * Las notificaciones de seguimiento llegan con ?ficha=<id>: al abrir la tabla
 * se abre esa ficha. Se lee una vez y se limpia de la barra de direcciones.
 */
export function useFichaParam(onOpen: (id: string) => void) {
  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get("ficha");
    if (!id) return;
    onOpen(id);
    url.searchParams.delete("ficha");
    window.history.replaceState(null, "", url.pathname + (url.search || ""));
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Quién puede quedar como responsable. */
export function useOwners(endpoint: string) {
  const [owners, setOwners] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    fetch(endpoint)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setOwners(Array.isArray(d) ? d : []))
      .catch(() => setOwners([]));
  }, [endpoint]);
  return owners;
}

// ── Historial y registrar actividad ─────────────────────────────────────

const ACTIVITY_ICONS: Record<LeadActivityType, React.ElementType> = {
  llamada: Phone,
  correo: Mail,
  whatsapp: MessageCircle,
  reunion: Video,
  visita: MapPin,
  cotizacion: FileText,
  nota: NotebookPen,
};

export function ActivityTimeline({
  activities,
  endpoint,
  canRemove,
  onChanged,
}: {
  activities: CrmActivity[];
  /** p. ej. /api/client-leads/abc/activities */
  endpoint: string;
  canRemove: (a: CrmActivity) => boolean;
  onChanged: () => void;
}) {
  const confirm = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);

  async function remove(a: CrmActivity) {
    const ok = await confirm({
      title: "¿Borrar la actividad?",
      description: "Desaparece del historial y no se puede recuperar.",
      confirmLabel: "Borrar",
      destructive: true,
    });
    if (!ok) return;
    setBusy(a.id);
    try {
      const res = await fetch(`${endpoint}/${a.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Actividad borrada.");
      onChanged();
    } catch {
      toast.error("No se pudo borrar.");
    } finally {
      setBusy(null);
    }
  }

  if (activities.length === 0) {
    return <p className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-sm">Todavía no hay actividades registradas.</p>;
  }
  return (
    <ol className="space-y-4">
      {activities.map((a) => {
        const Icon = ACTIVITY_ICONS[a.type];
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
              <p className="mt-0.5 text-sm break-words whitespace-pre-wrap">{a.summary}</p>
            </div>
            {canRemove(a) && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                aria-label="Borrar actividad"
                disabled={busy === a.id}
                onClick={() => remove(a)}
              >
                <Trash2 className="text-destructive size-3.5" />
              </Button>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function ActivityForm({
  endpoint,
  nextFollowUpOn: currentNext,
  nextAction: currentAction,
  onSaved,
}: {
  endpoint: string;
  nextFollowUpOn: string | null;
  nextAction: string | null;
  onSaved: () => void;
}) {
  const today = todayKey();
  const [type, setType] = useState<string>("llamada");
  const [occurredOn, setOccurredOn] = useState(today);
  const [summary, setSummary] = useState("");
  // Una fecha ya pasada no sirve como próximo seguimiento: se propone vacía.
  const [nextFollowUpOn, setNextFollowUpOn] = useState(currentNext && currentNext >= today ? currentNext : "");
  const [nextAction, setNextAction] = useState(currentAction ?? "");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (summary.trim().length < 3) return toast.error("Escribe qué pasó.");
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
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
    <form onSubmit={submit} className="space-y-3 rounded-md border p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Qué se hizo</Label>
          <AppSelect
            value={type}
            onValueChange={(v) => setType(v || "llamada")}
            options={LEAD_ACTIVITY_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            className="w-full"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="activity-date">Fecha</Label>
          <DatePicker id="activity-date" max={today} value={occurredOn} onChange={(v) => setOccurredOn(v)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="activity-summary">Qué pasó</Label>
        <Textarea id="activity-summary" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
        <p className="text-muted-foreground text-xs">Con quién hablaste, qué se acordó, qué quedó pendiente.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="activity-next-date">Próximo seguimiento</Label>
          <DatePicker id="activity-next-date" min={today} value={nextFollowUpOn} onChange={(v) => setNextFollowUpOn(v)} />
        </div>
        <div className="space-y-1.5">
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
  );
}

// ── Ficha (panel lateral) ───────────────────────────────────────────────

export function SheetSection({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-primary text-xs font-semibold tracking-wider uppercase">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Lista de datos etiqueta → valor. */
export function SheetRows({ children }: { children: React.ReactNode }) {
  return <dl className="bg-muted/40 divide-y rounded-md border text-sm">{children}</dl>;
}

export function SheetRow({ label, children }: { label: string; children: React.ReactNode }) {
  if (children === null || children === undefined || children === "" || children === false) return null;
  return (
    <div className="flex items-start justify-between gap-4 px-3 py-2">
      <dt className="text-muted-foreground shrink-0 text-xs">{label}</dt>
      <dd className="min-w-0 text-right font-medium break-words">{children}</dd>
    </div>
  );
}

/** Teléfono con enlaces para llamar y para escribir por WhatsApp. */
export function PhoneLinks({ phone }: { phone: string }) {
  const digits = phone.replace(/\D/g, "");
  const wa = digits.length === 10 ? `52${digits}` : digits;
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
      <a href={`tel:${phone}`} className="text-primary inline-flex items-center gap-1 hover:underline">
        <Phone className="size-3" aria-hidden />
        {formatPhone(phone)}
      </a>
      {digits.length >= 10 && (
        <a
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-green-700 hover:underline"
        >
          <MessageCircle className="size-3" aria-hidden />
          WhatsApp
        </a>
      )}
    </span>
  );
}

export function EmailLink({ email }: { email: string }) {
  return (
    <a href={`mailto:${email}`} className="text-primary text-email break-all hover:underline">
      <Mail className="mr-1 inline size-3 align-[-1px]" aria-hidden />
      {email}
    </a>
  );
}

export function SheetSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      {[2, 4, 3].map((n, k) => (
        <div key={k} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <div className="space-y-2 rounded-md border p-3">
            {Array.from({ length: n }, (_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Próximo seguimiento destacado arriba de la ficha. */
export function NextFollowUpBox({
  nextFollowUpOn,
  nextAction,
  open,
  today,
}: {
  nextFollowUpOn: string | null;
  nextAction: string | null;
  open: boolean;
  today: string;
}) {
  const state = followUpStateFor(nextFollowUpOn, today, open);
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md border p-3",
        state === "vencido" && "border-destructive/40 bg-destructive/5",
        state === "hoy" && "border-amber-300 bg-amber-50 dark:bg-amber-950/30"
      )}
    >
      <CalendarClock className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Próximo seguimiento</p>
        {nextFollowUpOn && open ? (
          <FollowUpCell nextFollowUpOn={nextFollowUpOn} nextAction={nextAction} open={open} today={today} />
        ) : (
          <p className="text-muted-foreground text-sm">{open ? "Sin fecha. Regístrala al guardar una actividad." : "Ya no tiene seguimiento."}</p>
        )}
      </div>
    </div>
  );
}

/** Armazón del panel lateral: encabezado, cuerpo con scroll y acciones abajo. */
export function CrmSheet({
  open,
  onClose,
  title,
  subtitle,
  badges,
  loading,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string | null;
  badges?: React.ReactNode;
  loading: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        <SheetHeader className="border-b pr-10">
          <SheetTitle className="text-lg">{title}</SheetTitle>
          <SheetDescription className={cn(!subtitle && "sr-only")}>{subtitle || "Ficha del prospecto"}</SheetDescription>
          {!loading && badges && <div className="flex flex-wrap gap-1.5 pt-1">{badges}</div>}
        </SheetHeader>
        <div className="flex-1 space-y-5 overflow-y-auto p-4">{loading ? <SheetSkeleton /> : children}</div>
        {!loading && footer && <SheetFooter className="flex-row flex-wrap justify-end border-t">{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  );
}

/**
 * Pide el motivo al cerrar un prospecto sin éxito (perdido / descartado):
 * meses después nadie se acuerda de por qué.
 */
export function ReasonDialog({
  open,
  title,
  description,
  label,
  hint,
  confirmLabel,
  initial,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  label: string;
  hint: string;
  confirmLabel: string;
  initial: string;
  onCancel: () => void;
  /** Devuelve true si se guardó, para cerrar. */
  onConfirm: (reason: string) => Promise<boolean>;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        {open && (
          <ReasonDialogBody
            title={title}
            description={description}
            label={label}
            hint={hint}
            confirmLabel={confirmLabel}
            initial={initial}
            onCancel={onCancel}
            onConfirm={onConfirm}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReasonDialogBody({
  title,
  description,
  label,
  hint,
  confirmLabel,
  initial,
  onCancel,
  onConfirm,
}: Omit<React.ComponentProps<typeof ReasonDialog>, "open">) {
  const [reason, setReason] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Label htmlFor="crm-reason">{label}</Label>
        <Textarea id="crm-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        <p className="text-muted-foreground text-xs">{hint}</p>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          onClick={async () => {
            setBusy(true);
            await onConfirm(reason.trim());
            setBusy(false);
          }}
          disabled={busy || !reason.trim()}
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          {confirmLabel}
        </Button>
      </DialogFooter>
    </>
  );
}
