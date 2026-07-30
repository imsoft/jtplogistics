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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { MURAL_KIND_COLORS, MURAL_KIND_LABELS } from "@/lib/constants/mural";
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

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
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

function AgendaSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border p-4">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PostsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-3 rounded-lg border p-4">
          <Skeleton className="aspect-[3/2] w-full rounded-md" />
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

  const loadEntries = useCallback(() => {
    const today = new Date();
    const until = new Date(today.getTime() + AGENDA_DAYS * 86_400_000);
    const query = `?from=${isoDay(today)}&to=${isoDay(until)}`;

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

  const groupedAgenda = useMemo(() => {
    if (!agenda) return null;
    const groups = new Map<string, AgendaItem[]>();
    for (const item of agenda) {
      const day = item.date.slice(0, 10);
      const bucket = groups.get(day);
      if (bucket) bucket.push(item);
      else groups.set(day, [item]);
    }
    return [...groups.entries()];
  }, [agenda]);

  const canCreate = permissions?.canCreate ?? false;
  const canUpdate = permissions?.canUpdate ?? false;
  const canDelete = permissions?.canDelete ?? false;

  return (
    <div className="min-w-0 space-y-8">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      {/* ── Agenda: celebraciones, eventos, capacitaciones y vacaciones ── */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Próximos {AGENDA_DAYS} días</h2>
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
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No hay nada agendado en los próximos {AGENDA_DAYS} días.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {groupedAgenda.map(([day, items]) => (
              <div key={day} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {formatDay(day)}
                </p>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/40"
                    >
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt=""
                          width={40}
                          height={40}
                          className="size-10 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                          {(() => {
                            const Icon = KIND_ICONS[item.kind];
                            return <Icon className="size-4 text-muted-foreground" />;
                          })()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">{item.title}</p>
                          <KindBadge kind={item.kind} />
                        </div>
                        {item.subtitle && (
                          <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                        )}
                        {item.entry && (
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>{formatRange(item.entry.startDate, item.entry.endDate)}</span>
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

                      {item.entry && (canUpdate || canDelete) && (
                        <div className="flex shrink-0 items-center gap-1">
                          {canUpdate && (
                            <Button variant="ghost" size="icon" asChild>
                              <Link
                                href={`${basePath}/entries/${item.entry.id}`}
                                aria-label={`Editar ${item.entry.title}`}
                              >
                                <Pencil className="size-4" />
                              </Link>
                            </Button>
                          )}
                          {canDelete && (
                            <DeleteConfirmDialog
                              title="Eliminar entrada"
                              description={`Se eliminará "${item.entry.title}" del mural.`}
                              onConfirm={() => handleDeleteEntry(item.entry!.id)}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* ── Blog / noticias ── */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Noticias</h2>
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
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Todavía no hay publicaciones.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`${basePath}/posts/${post.id}`}
                className="group flex flex-col overflow-hidden rounded-lg border transition-colors hover:bg-muted/40"
              >
                {post.coverUrl ? (
                  <div className="relative aspect-[3/2] w-full overflow-hidden bg-muted">
                    <Image
                      src={post.coverUrl}
                      alt=""
                      fill
                      className="object-cover transition-transform group-hover:scale-[1.02]"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[3/2] w-full items-center justify-center bg-muted">
                    <Newspaper className="size-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{post.title}</p>
                    {!post.published && <Badge variant="outline">Borrador</Badge>}
                  </div>
                  {post.excerpt && (
                    <p className="line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
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
