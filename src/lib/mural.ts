/**
 * Serialización y validación compartida de las entradas del mural.
 */

import type { MuralEntry as MuralEntryModel, MuralPost as MuralPostModel } from "@prisma/client";
import { MURAL_KIND_LABELS } from "@/lib/constants/mural";
import type { MuralEntry, MuralPost } from "@/types/mural.types";

type EntryWithRelations = MuralEntryModel & {
  author: { name: string };
  subject: { name: string } | null;
};

export function serializeEntry(entry: EntryWithRelations): MuralEntry {
  return {
    id: entry.id,
    type: entry.type,
    title: entry.title,
    description: entry.description,
    location: entry.location,
    startDate: entry.startDate.toISOString(),
    endDate: entry.endDate?.toISOString() ?? null,
    imageUrl: entry.imageUrl,
    imagePublicId: entry.imagePublicId,
    subjectUserId: entry.subjectUserId,
    subjectName: entry.subject?.name ?? null,
    authorId: entry.authorId,
    authorName: entry.author.name,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

type PostWithAuthor = MuralPostModel & { author: { name: string } };

export function serializePost(post: PostWithAuthor): MuralPost {
  return {
    id: post.id,
    title: post.title,
    excerpt: post.excerpt,
    contentJson: post.contentJson,
    coverUrl: post.coverUrl,
    coverPublicId: post.coverPublicId,
    published: post.published,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    authorId: post.authorId,
    authorName: post.author.name,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

/**
 * Convierte "2026-08-14" (o un ISO completo) a una fecha UTC a medianoche.
 * Se guarda sin hora para que el día no se recorra por zona horaria.
 */
export function parseMuralDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day))
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Rango legible de una entrada, para notificaciones y correos. */
export function formatDateRange(start: Date, end: Date | null): string {
  const fmt = new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  if (!end || end.getTime() === start.getTime()) return fmt.format(start);
  return `${fmt.format(start)} al ${fmt.format(end)}`;
}

export function entryKindLabel(type: MuralEntryModel["type"]): string {
  return MURAL_KIND_LABELS[type];
}
