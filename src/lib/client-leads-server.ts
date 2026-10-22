/**
 * CRM de clientes, lado servidor: lectura segura del cuerpo, forma del JSON y
 * las consultas que comparten las rutas de /api/client-leads.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ACTIVE_USERS } from "@/lib/offboarding";
import { LEAD_SOURCE_VALUES, LEAD_STAGE_VALUES } from "@/lib/client-leads";

/** Sufijo de los permisos: canView/Create/Update/DeleteClientLeads. */
export const LEADS_MODULE = "ClientLeads";

export const LEAD_INCLUDE = {
  owner: { select: { id: true, name: true } },
  createdBy: { select: { name: true } },
  client: { select: { id: true, name: true } },
  activities: {
    orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
    take: 1,
    select: { type: true, occurredOn: true, summary: true },
  },
} satisfies Prisma.ClientLeadInclude;

type LeadRow = Prisma.ClientLeadGetPayload<{ include: typeof LEAD_INCLUDE }>;

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export function leadToJson(l: LeadRow) {
  const last = l.activities[0];
  return {
    id: l.id,
    companyName: l.companyName,
    contactName: l.contactName,
    position: l.position,
    phone: l.phone,
    email: l.email,
    city: l.city,
    industry: l.industry,
    source: l.source,
    stage: l.stage,
    estimatedMonthly: l.estimatedMonthly,
    notes: l.notes,
    lostReason: l.lostReason,
    nextAction: l.nextAction,
    nextFollowUpOn: day(l.nextFollowUpOn),
    ownerId: l.ownerId,
    ownerName: l.owner?.name ?? null,
    clientId: l.clientId,
    clientName: l.client?.name ?? null,
    createdByName: l.createdBy?.name ?? null,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
    lastActivity: last ? { type: last.type, occurredOn: day(last.occurredOn)!, summary: last.summary } : null,
  };
}

export type LeadJson = ReturnType<typeof leadToJson>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "YYYY-MM-DD" → Date a medianoche UTC; "" o null → null; otra cosa → undefined (no cambia). */
export function readDate(value: unknown): Date | null | undefined {
  if (typeof value === "string" && DATE_RE.test(value)) return new Date(`${value}T00:00:00.000Z`);
  if (value === null || value === "") return null;
  return undefined;
}

/** Lee del cuerpo solo los campos del prospecto, sin confiar en lo que llegue. */
export function readLeadBody(body: Record<string, unknown>) {
  const text = (key: string) =>
    typeof body[key] === "string" ? (body[key] as string).trim() || null : body[key] === null ? null : undefined;
  const enumValue = (key: string, allowed: readonly string[]) =>
    typeof body[key] === "string" && allowed.includes(body[key] as string)
      ? (body[key] as string)
      : body[key] === null || body[key] === ""
        ? null
        : undefined;

  let estimatedMonthly: number | null | undefined;
  if (body.estimatedMonthly === null || body.estimatedMonthly === "") estimatedMonthly = null;
  else if (body.estimatedMonthly !== undefined) {
    const n = Number(String(body.estimatedMonthly).replace(/[$,\s]/g, ""));
    estimatedMonthly = Number.isFinite(n) && n >= 0 ? n : undefined;
  }

  return {
    companyName: text("companyName"),
    contactName: text("contactName"),
    position: text("position"),
    phone: text("phone"),
    email: text("email")?.toLowerCase() ?? text("email"),
    city: text("city"),
    industry: text("industry"),
    notes: text("notes"),
    lostReason: text("lostReason"),
    nextAction: text("nextAction"),
    source: enumValue("source", LEAD_SOURCE_VALUES),
    stage: enumValue("stage", LEAD_STAGE_VALUES),
    estimatedMonthly,
    nextFollowUpOn: readDate(body.nextFollowUpOn),
    ownerId: typeof body.ownerId === "string" && body.ownerId ? body.ownerId : body.ownerId === null || body.ownerId === "" ? null : undefined,
  };
}

/** Quién puede ser responsable de un prospecto: dirección y colaboradores activos. */
export async function leadOwners() {
  return prisma.user.findMany({
    where: { role: { in: ["admin", "collaborator"] }, ...ACTIVE_USERS },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/** El responsable tiene que ser alguien del equipo, no un id cualquiera. */
export async function isValidOwner(ownerId: string): Promise<boolean> {
  const u = await prisma.user.findFirst({
    where: { id: ownerId, role: { in: ["admin", "collaborator"] }, ...ACTIVE_USERS },
    select: { id: true },
  });
  return u !== null;
}

/**
 * Cotizaciones ya hechas a esta empresa. Las cotizaciones guardan al cliente
 * como texto, así que se buscan por nombre (sin distinguir mayúsculas) con el
 * nombre del prospecto y, si ya es cliente, con el del catálogo.
 */
export async function quotesForLead(names: string[]) {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (unique.length === 0) return [];
  const [ground, maritime] = await Promise.all([
    prisma.generatedQuote.findMany({
      where: { OR: unique.map((n) => ({ company: { equals: n, mode: "insensitive" as const } })) },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, quoteNumber: true, status: true, validUntil: true, createdAt: true, rows: true, createdBy: { select: { name: true } } },
    }),
    prisma.maritimeQuote.findMany({
      where: { OR: unique.map((n) => ({ client: { equals: n, mode: "insensitive" as const } })) },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, reference: true, status: true, validUntil: true, createdAt: true, createdBy: { select: { name: true } } },
    }),
  ]);
  const amount = (rows: unknown) =>
    Array.isArray(rows) ? rows.reduce((s: number, r) => s + (Number((r as { cost?: unknown })?.cost) || 0), 0) : null;
  return [
    ...ground.map((g) => ({
      id: g.id,
      kind: "terrestre" as const,
      number: g.quoteNumber,
      status: g.status,
      validUntil: g.validUntil.toISOString(),
      createdAt: g.createdAt.toISOString(),
      createdByName: g.createdBy?.name ?? null,
      amount: amount(g.rows),
    })),
    ...maritime.map((m) => ({
      id: m.id,
      kind: "maritima" as const,
      number: m.reference,
      status: m.status,
      validUntil: m.validUntil.toISOString(),
      createdAt: m.createdAt.toISOString(),
      createdByName: m.createdBy?.name ?? null,
      amount: null,
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
