"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Cake,
  PartyPopper,
  CalendarDays,
  GraduationCap,
  Palmtree,
  Plus,
  Pencil,
  MapPin,
  Newspaper,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  MURAL_KIND_ACCENTS,
  MURAL_KIND_COLORS,
  MURAL_KIND_LABELS,
} from "@/lib/constants/mural";
import type {
  MuralCelebration,
  MuralEntry,
  MuralItemKind,
  MuralPermissions,
  MuralPost,
} from "@/types/mural.types";

const KIND_ICONS: Record<MuralItemKind, React.ElementType> = {
  birthday: Cake,
  anniversary: PartyPopper,
  event: CalendarDays,
  training: GraduationCap,
  vacation: Palmtree,
};

/** Días hacia adelante que muestra la agenda del mural. */
const AGENDA_DAYS = 60;

/**
 * "YYYY-MM-DD" del día en la zona horaria de quien mira, no en UTC: en México
 * toISOString() ya adelanta el día a partir de las 18:00 y las celebraciones de
 * hoy se perderían justo la tarde en que hay que felicitar.
 */
function isoDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDay(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(iso));
}

function formatRange(start: string, end: string | null): string {
  const fmt = new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  if (!end || end.slice(0, 10) === start.slice(0, 10)) return fmt.format(new Date(start));
  return `${fmt.format(new Date(start))} – ${fmt.format(new Date(end))}`;
}

/** Días completos entre hoy y un día "YYYY-MM-DD". */
function daysFromToday(iso: string, today: string): number {
  const a = Date.parse(`${today}T00:00:00Z`);
  const b = Date.parse(`${iso}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** "Hoy", "Mañana" o "En 5 días": ubica el día sin tener que contar del calendario. */
function relativeDayLabel(iso: string, today: string): string | null {
  const diff = daysFromToday(iso, today);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff > 1 && diff <= 7) return `En ${diff} días`;
  return null;
}

interface AgendaItem {
  key: string;
  kind: MuralItemKind;
  date: string;
  title: string;
  subtitle: string | null;
  image: string | null;
  entry?: MuralEntry;
}

function KindBadge({ kind }: { kind: MuralItemKind }) {
  const Icon = KIND_ICONS[kind];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${MURAL_KIND_COLORS[kind]}`}
    >
      <Icon className="size-3" />
      {MURAL_KIND_LABELS[kind]}
    </span>
  );
}

/** Foto de la persona; si no tiene, el icono de su tipo sobre un fondo del color. */
function ItemAvatar({
  item,
  size = "md",
}: {
  item: AgendaItem;
  size?: "md" | "lg";
}) {
  const accent = MURAL_KIND_ACCENTS[item.kind];
  const Icon = KIND_ICONS[item.kind];
  const px = size === "lg" ? 64 : 44;
  const box = size === "lg" ? "size-16" : "size-11";
  const icon = size === "lg" ? "size-7" : "size-5";

  if (item.image) {
    return (
      <Image
        src={item.image}
        alt=""
        width={px}
        height={px}
        className={`${box} shrink-0 rounded-full object-cover ring-2 ring-offset-2 ring-offset-background ${accent.ring}`}
      />
    );
  }
  return (
    <div
      className={`${box} flex shrink-0 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-background ${accent.soft} ${accent.ring}`}
    >
      <Icon className={icon} />
    </div>
  );
}

interface EntryActionsProps {
  basePath: string;
  canUpdate: boolean;
  canDelete: boolean;
  onDelete: (id: string) => void;
}

/** Acciones de una entrada (las celebraciones se editan desde la ficha de la persona). */
function EntryActions({
  entry,
  basePath,
  canUpdate,
  canDelete,
  onDelete,
}: EntryActionsProps & { entry: MuralEntry }) {
  if (!canUpdate && !canDelete) return null;
  return (
    <div className="flex shrink-0 items-center gap-1">
      {canUpdate && (
        <Button variant="ghost" size="icon" asChild>
          <Link href={`${basePath}/entries/${entry.id}`} aria-label={`Editar ${entry.title}`}>
            <Pencil className="size-4" />
          </Link>
        </Button>
      )}
      {canDelete && (
        <DeleteConfirmDialog
          title="Eliminar entrada"
          description={`Se eliminará "${entry.title}" del mural.`}
          onConfirm={() => onDelete(entry.id)}
        />
      )}
    </div>
  );
}

/** Tarjeta de la línea de tiempo: filo de color del tipo, foto, datos y acciones. */
function AgendaCard({ item, actions }: { item: AgendaItem; actions: EntryActionsProps }) {
  const accent = MURAL_KIND_ACCENTS[item.kind];
  return (
    <div
      className={`flex items-start gap-4 rounded-xl border border-l-4 bg-card p-4 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md ${accent.edge}`}
    >
      <ItemAvatar item={item} />

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold">{item.title}</p>
          <KindBadge kind={item.kind} />
        </div>
        {item.subtitle && (
          <p className="text-xs font-medium text-muted-foreground">{item.subtitle}</p>
        )}
        {item.entry && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3" />
              {formatRange(item.entry.startDate, item.entry.endDate)}
            </span>
            {item.entry.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" />
                {item.entry.location}
              </span>
            )}
          </div>
        )}
        {item.entry?.description && (
          <p className="text-sm text-muted-foreground">{item.entry.description}</p>
        )}
      </div>

      {item.entry && <EntryActions entry={item.entry} {...actions} />}
    </div>
  );
}

function AgendaSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1].map((group) => (
        <div key={group} className="space-y-3">
          <Skeleton className="h-3 w-40" />
          <div className="space-y-3 pl-6">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-4 rounded-xl border p-4">
                <Skeleton className="size-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PostsSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-3 rounded-2xl border p-4">
          <Skeleton className="aspect-3/2 w-full rounded-xl" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

interface MuralBoardProps {
  /** `/admin/dashboard/mural` o `/collaborator/dashboard/mural`. */
  basePath: string;
}

export function MuralBoard({ basePath }: MuralBoardProps) {
  const [permissions, setPermissions] = useState<MuralPermissions | null>(null);
  const [celebrations, setCelebrations] = useState<MuralCelebration[] | null>(null);
  const [entries, setEntries] = useState<MuralEntry[] | null>(null);
  const [posts, setPosts] = useState<MuralPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Se fija al montar para que "Hoy" no cambie si la pestaña queda abierta.
  const [today] = useState(() => isoDay(new Date()));

  const loadEntries = useCallback(() => {
    const now = new Date();
    const until = new Date(now.getTime() + AGENDA_DAYS * 86_400_000);
    const query = `?from=${isoDay(now)}&to=${isoDay(until)}`;

    fetch(`/api/mural/entries${query}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setEntries)
      .catch(() => setEntries([]));

    fetch(`/api/mural/celebrations${query}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setCelebrations)
      .catch(() => setCelebrations([]));
  }, []);

  const loadPosts = useCallback(() => {
    fetch("/api/mural/posts")
      .then((r) => (r.ok ? r.json() : []))
      .then(setPosts)
      .catch(() => setPosts([]));
  }, []);

  useEffect(() => {
    fetch("/api/mural/permissions")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: MuralPermissions | null) => setPermissions(data))
      .catch(() => setPermissions(null));
    loadEntries();
    loadPosts();
  }, [loadEntries, loadPosts]);

  async function handleDeleteEntry(id: string) {
    const res = await fetch(`/api/mural/entries/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("No se pudo eliminar la entrada.");
      return;
    }
    setEntries((prev) => prev?.filter((e) => e.id !== id) ?? null);
  }

  const agenda: AgendaItem[] | null = useMemo(() => {
    if (!celebrations || !entries) return null;

    const items: AgendaItem[] = [
      ...celebrations.map((c) => ({
        key: `${c.kind}-${c.userId}-${c.date}`,
        kind: c.kind,
        date: c.date,
        title: c.name,
        subtitle:
          c.kind === "birthday"
            ? c.years
              ? `Cumple ${c.years} años`
              : "Cumpleaños"
            : `${c.years ?? 1} ${(c.years ?? 1) === 1 ? "año" : "años"} en JTP`,
        image: c.image,
      })),
      ...entries.map((e) => ({
        key: `entry-${e.id}`,
        kind: e.type as MuralItemKind,
        date: e.startDate,
        title: e.title,
        subtitle: e.subjectName,
        image: e.imageUrl,
        entry: e,
      })),
    ];

    return items.sort((a, b) => a.date.localeCompare(b.date));
  }, [celebrations, entries]);

  /** Lo de hoy sale destacado arriba; el resto baja a la línea de tiempo. */
  const todayItems = useMemo(
    () => agenda?.filter((i) => i.date.slice(0, 10) === today) ?? null,
    [agenda, today]
  );

  const groupedAgenda = useMemo(() => {
    if (!agenda) return null;
    const groups = new Map<string, AgendaItem[]>();
    for (const item of agenda) {
      const day = item.date.slice(0, 10);
      if (day === today) continue;
      const bucket = groups.get(day);
      if (bucket) bucket.push(item);
      else groups.set(day, [item]);
    }
    return [...groups.entries()];
  }, [agenda, today]);

  const canCreate = permissions?.canCreate ?? false;
  const canUpdate = permissions?.canUpdate ?? false;
  const canDelete = permissions?.canDelete ?? false;

  const actions: EntryActionsProps = {
    basePath,
    canUpdate,
    canDelete,
    onDelete: handleDeleteEntry,
  };

  return (
    <div className="min-w-0 space-y-10">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      {/* ── Lo de hoy: lo primero que se ve al entrar ── */}
      {todayItems && todayItems.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-amber-200/80 bg-linear-to-br from-amber-50 via-rose-50/70 to-background p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-amber-500" />
            <h2 className="text-base font-bold tracking-wide text-amber-900 sm:text-lg">
              Hoy en JTP
            </h2>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {todayItems.map((item) => (
              <div
                key={item.key}
                className="flex items-center gap-4 rounded-xl bg-background/70 p-4 shadow-xs backdrop-blur-sm"
              >
                <ItemAvatar item={item} size="lg" />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-base font-bold">{item.title}</p>
                  {item.subtitle && (
                    <p className="text-sm font-medium text-muted-foreground">{item.subtitle}</p>
                  )}
                  <KindBadge kind={item.kind} />
                </div>
                {item.entry && <EntryActions entry={item.entry} {...actions} />}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Agenda: celebraciones, eventos, capacitaciones y vacaciones ── */}
      <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">Próximos {AGENDA_DAYS} días</h2>
            <p className="text-muted-foreground mt-0.5 text-[10px] font-semibold uppercase tracking-wide sm:text-xs">
              Cumpleaños, aniversarios, eventos, capacitaciones y vacaciones
            </p>
          </div>
          {canCreate && (
            <Button asChild size="sm" className="w-full shrink-0 sm:w-fit">
              <Link href={`${basePath}/entries/new`}>
                <Plus className="size-4" />
                Nueva entrada
              </Link>
            </Button>
          )}
        </div>

        {!groupedAgenda ? (
          <AgendaSkeleton />
        ) : groupedAgenda.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <CalendarDays className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {todayItems && todayItems.length > 0
                  ? "No hay nada más agendado en los próximos días."
                  : `No hay nada agendado en los próximos ${AGENDA_DAYS} días.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          // Línea de tiempo: el hilo vertical enlaza los días y cada punto toma
          // el color del primer tipo de ese día.
          <ol className="relative space-y-8 border-l border-dashed border-border pl-6 sm:pl-8">
            {groupedAgenda.map(([day, items]) => {
              const relative = relativeDayLabel(day, today);
              return (
                <li key={day} className="relative space-y-3">
                  <span
                    className={`absolute -left-6.5 top-1.5 size-2.5 rounded-full ring-4 ring-background sm:-left-8.5 ${
                      MURAL_KIND_ACCENTS[items[0].kind].dot
                    }`}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-bold uppercase tracking-wide">{formatDay(day)}</p>
                    {relative && (
                      <Badge variant="secondary" className="text-[10px]">
                        {relative}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <AgendaCard key={item.key} item={item} actions={actions} />
                    ))}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* ── Blog / noticias ── */}
      <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">Noticias</h2>
            <p className="text-muted-foreground mt-0.5 text-[10px] font-semibold uppercase tracking-wide sm:text-xs">
              Comunicados y novedades de JTP Logistics
            </p>
          </div>
          {canCreate && (
            <Button asChild size="sm" className="w-full shrink-0 sm:w-fit">
              <Link href={`${basePath}/posts/new`}>
                <Plus className="size-4" />
                Nueva publicación
              </Link>
            </Button>
          )}
        </div>

        {!posts ? (
          <PostsSkeleton />
        ) : posts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Newspaper className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Todavía no hay publicaciones.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`${basePath}/posts/${post.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-xs transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {post.coverUrl ? (
                  <div className="relative aspect-3/2 w-full overflow-hidden bg-muted">
                    <Image
                      src={post.coverUrl}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-3/2 w-full items-center justify-center bg-linear-to-br from-secondary to-muted">
                    <Newspaper className="size-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold group-hover:text-primary">{post.title}</p>
                    {!post.published && <Badge variant="outline">Borrador</Badge>}
                  </div>
                  {post.excerpt && (
                    <p className="line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>
                  )}
                  <p className="mt-auto pt-2 text-xs font-medium text-muted-foreground">
                    {post.authorName} ·{" "}
                    {new Intl.DateTimeFormat("es-MX", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }).format(new Date(post.publishedAt ?? post.createdAt))}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
