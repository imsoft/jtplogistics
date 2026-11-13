import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { searchTerms } from "@/lib/search";
import { logAudit } from "@/lib/audit-log";
import { requireProspectAccess } from "@/lib/prospect-auth";
import { alertProspectReady } from "@/lib/provider-onboarding-alerts-server";
import { isValidOwner, readDate } from "@/lib/client-leads-server";
import {
  PROSPECT_COVERAGE_VALUES,
  PROSPECT_SOURCE_VALUES,
  PROSPECT_STATUS_LABELS,
  PROSPECT_STATUS_VALUES,
  isProspectStatus,
  requiresDiscardReason,
} from "@/lib/provider-prospects";

const SEARCH_FIELDS = ["commercialName", "contactName", "phone", "email", "legalName", "city", "notes"] as const;

/** Lo que se carga con cada prospecto: autor, responsable, alta y última actividad. */
export const PROSPECT_INCLUDE = {
  createdBy: { select: { name: true } },
  owner: { select: { id: true, name: true } },
  onboarding: { select: { id: true } },
  activities: {
    orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
    take: 1,
    select: { type: true, occurredOn: true, summary: true },
  },
} satisfies Prisma.ProviderProspectInclude;

type ProspectRow = Prisma.ProviderProspectGetPayload<{ include: typeof PROSPECT_INCLUDE }>;

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export function prospectToJson(p: ProspectRow) {
  const last = p.activities[0];
  return {
    id: p.id,
    commercialName: p.commercialName,
    contactName: p.contactName,
    phone: p.phone,
    email: p.email,
    website: p.website,
    source: p.source,
    coverage: p.coverage,
    status: p.status,
    legalName: p.legalName,
    city: p.city,
    contactedOn: day(p.contactedOn),
    notes: p.notes,
    discardReason: p.discardReason,
    nextAction: p.nextAction,
    nextFollowUpOn: day(p.nextFollowUpOn),
    ownerId: p.ownerId,
    ownerName: p.owner?.name ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    createdByName: p.createdBy?.name ?? null,
    // Para no ofrecer "Iniciar alta" a quien ya tiene una.
    onboardingId: p.onboarding?.id ?? null,
    lastActivity: last ? { type: last.type, occurredOn: day(last.occurredOn)!, summary: last.summary } : null,
  };
}

/** Lee del cuerpo solo los campos del prospecto, sin confiar en lo que llegue. */
export function readProspectBody(body: Record<string, unknown>) {
  const text = (key: string) => (typeof body[key] === "string" ? (body[key] as string).trim() || null : undefined);
  const enumValue = (key: string, allowed: readonly string[]) =>
    typeof body[key] === "string" && allowed.includes(body[key] as string)
      ? (body[key] as string)
      : body[key] === null || body[key] === ""
        ? null
        : undefined;

  return {
    commercialName: text("commercialName"),
    contactName: text("contactName"),
    phone: text("phone"),
    email: text("email"),
    website: text("website"),
    legalName: text("legalName"),
    city: text("city"),
    notes: text("notes"),
    discardReason: text("discardReason"),
    source: enumValue("source", PROSPECT_SOURCE_VALUES),
    coverage: enumValue("coverage", PROSPECT_COVERAGE_VALUES),
    status: enumValue("status", PROSPECT_STATUS_VALUES),
    nextAction: typeof body.nextAction === "string" ? body.nextAction.trim() || null : body.nextAction === null ? null : undefined,
    nextFollowUpOn: readDate(body.nextFollowUpOn),
    ownerId: typeof body.ownerId === "string" && body.ownerId ? body.ownerId : body.ownerId === null || body.ownerId === "" ? null : undefined,
    contactedOn:
      typeof body.contactedOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.contactedOn)
        ? new Date(`${body.contactedOn}T00:00:00.000Z`)
        : body.contactedOn === null || body.contactedOn === ""
          ? null
          : undefined,
  };
}

/** GET /api/provider-prospects?q=&status= */
export async function GET(request: Request) {
  try {
    await requireProspectAccess("view");
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    const status = searchParams.get("status");

    const where: Prisma.ProviderProspectWhereInput = {};
    if (isProspectStatus(status)) where.status = status;
    if (q) {
      where.OR = SEARCH_FIELDS.flatMap((field) =>
        searchTerms(q).map((term) => ({ [field]: { contains: term, mode: "insensitive" as Prisma.QueryMode } }))
      ) as Prisma.ProviderProspectWhereInput[];
    }

    const prospects = await prisma.providerProspect.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: PROSPECT_INCLUDE,
    });

    return Response.json(prospects.map(prospectToJson));
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[provider-prospects] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/** POST /api/provider-prospects */
export async function POST(request: Request) {
  try {
    const session = await requireProspectAccess("create");
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const data = readProspectBody(body);

    if (!data.commercialName) {
      return Response.json({ error: "Escribe el nombre comercial." }, { status: 400 });
    }
    if (data.status && requiresDiscardReason(data.status as never) && !data.discardReason) {
      return Response.json({ error: "Escribe por qué se descarta." }, { status: 400 });
    }

    // Sin responsable elegido, queda quien lo captura (igual que en clientes).
    const ownerId = data.ownerId ?? session.user.id;
    if (data.ownerId && !(await isValidOwner(data.ownerId))) {
      return Response.json({ error: "El responsable no es válido." }, { status: 400 });
    }

    const created = await prisma.providerProspect.create({
      data: {
        commercialName: data.commercialName,
        contactName: data.contactName ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        website: data.website ?? null,
        legalName: data.legalName ?? null,
        city: data.city ?? null,
        notes: data.notes ?? null,
        discardReason: data.discardReason ?? null,
        contactedOn: data.contactedOn ?? null,
        nextAction: data.nextAction ?? null,
        nextFollowUpOn: data.nextFollowUpOn ?? null,
        ownerId,
        ...(data.source ? { source: data.source as never } : {}),
        ...(data.coverage ? { coverage: data.coverage as never } : {}),
        ...(data.status ? { status: data.status as never } : {}),
        createdById: session.user.id,
      },
      select: { id: true, status: true, commercialName: true, legalName: true },
    });
    void alertProspectReady(created, null, session.user);

    void logAudit({
      resource: "provider_prospect",
      resourceId: created.id,
      resourceLabel: data.commercialName,
      action: "created",
      userId: session.user.id,
      userName: session.user.name,
      changes: [
        {
          field: "status",
          label: "Etapa",
          from: null,
          to: PROSPECT_STATUS_LABELS[created.status as keyof typeof PROSPECT_STATUS_LABELS],
        },
      ],
    });

    return Response.json({ id: created.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[provider-prospects] POST", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
