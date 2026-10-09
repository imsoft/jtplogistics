import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { requireModuleAccess } from "@/lib/module-access";
import { companyDateKey } from "@/lib/time-clock";
import {
  CONTRACT_STATUS_LABELS,
  ONBOARDING_DOCS,
  completedOnAfterChange,
  isContractStatus,
  isDocStatus,
  validateHold,
  type DocRecord,
} from "@/lib/provider-onboardings";

export const MODULE = "ProviderOnboardings";

const DATE_FIELDS = [
  "startedOn",
  "completedOn",
  "legalRequestedOn",
  "legalReceivedOn",
  "sentToProviderOn",
  "signedReceivedOn",
  "onHoldSince",
] as const;
type DateField = (typeof DATE_FIELDS)[number];

const TEXT_FIELDS = [
  "legalName",
  "commercialName",
  "altaAuthorizedBy",
  "contractAuthorizedBy",
  "notes",
  "purchasingNotes",
  "holdReason",
] as const;
type TextField = (typeof TEXT_FIELDS)[number];

export const ONBOARDING_INCLUDE = {
  createdBy: { select: { name: true } },
  prospect: { select: { id: true, status: true } },
} satisfies Prisma.ProviderOnboardingInclude;

type Row = Prisma.ProviderOnboardingGetPayload<{ include: typeof ONBOARDING_INCLUDE }>;

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export function onboardingToJson(o: Row) {
  const docs = Object.fromEntries(ONBOARDING_DOCS.map((d) => [d.key, o[d.key]])) as DocRecord;
  return {
    id: o.id,
    legalName: o.legalName,
    commercialName: o.commercialName,
    prospectId: o.prospectId,
    startedOn: day(o.startedOn)!,
    docs,
    completedOn: day(o.completedOn),
    altaAuthorizedBy: o.altaAuthorizedBy,
    contractStatus: o.contractStatus,
    legalRequestedOn: day(o.legalRequestedOn),
    legalReceivedOn: day(o.legalReceivedOn),
    sentToProviderOn: day(o.sentToProviderOn),
    signedReceivedOn: day(o.signedReceivedOn),
    contractAuthorizedBy: o.contractAuthorizedBy,
    notes: o.notes,
    purchasingNotes: o.purchasingNotes,
    onHoldSince: day(o.onHoldSince),
    holdReason: o.holdReason,
    createdByName: o.createdBy?.name ?? null,
    createdAt: o.createdAt.toISOString(),
  };
}

/** Lee del cuerpo solo lo que es del alta, sin confiar en lo que llegue. */
export function readOnboardingBody(body: Record<string, unknown>) {
  const text = (key: TextField) =>
    typeof body[key] === "string" ? (body[key] as string).trim() || null : undefined;
  const date = (key: DateField) =>
    typeof body[key] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body[key] as string)
      ? new Date(`${body[key]}T00:00:00.000Z`)
      : body[key] === null || body[key] === ""
        ? null
        : undefined;

  const docsIn = (body.docs ?? {}) as Record<string, unknown>;
  const docs: Partial<DocRecord> = {};
  for (const d of ONBOARDING_DOCS) {
    if (isDocStatus(docsIn[d.key])) docs[d.key] = docsIn[d.key] as DocRecord[typeof d.key];
  }

  return {
    texts: Object.fromEntries(TEXT_FIELDS.map((k) => [k, text(k)])) as Record<TextField, string | null | undefined>,
    dates: Object.fromEntries(DATE_FIELDS.map((k) => [k, date(k)])) as Record<DateField, Date | null | undefined>,
    docs,
    contractStatus: isContractStatus(body.contractStatus) ? body.contractStatus : undefined,
    prospectId: typeof body.prospectId === "string" && body.prospectId ? body.prospectId : body.prospectId === null ? null : undefined,
  };
}

const SEARCH_FIELDS = ["legalName", "commercialName", "altaAuthorizedBy", "contractAuthorizedBy", "notes", "purchasingNotes"] as const;

/** GET /api/provider-onboardings?q= */
export async function GET(request: Request) {
  try {
    await requireModuleAccess(MODULE, "view");
    const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
    const where: Prisma.ProviderOnboardingWhereInput = q
      ? { OR: SEARCH_FIELDS.map((f) => ({ [f]: { contains: q, mode: "insensitive" as Prisma.QueryMode } })) }
      : {};
    const rows = await prisma.providerOnboarding.findMany({
      where,
      orderBy: { startedOn: "desc" },
      include: ONBOARDING_INCLUDE,
    });
    return Response.json(rows.map(onboardingToJson));
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[provider-onboardings] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/** POST /api/provider-onboardings */
export async function POST(request: Request) {
  try {
    const session = await requireModuleAccess(MODULE, "create");
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const { texts, dates, docs, contractStatus, prospectId } = readOnboardingBody(body);

    if (!texts.legalName) return Response.json({ error: "Escribe la razón social." }, { status: 400 });
    if (!texts.commercialName) return Response.json({ error: "Escribe el nombre comercial." }, { status: 400 });
    if (!dates.startedOn) return Response.json({ error: "Escribe la fecha de inicio del alta." }, { status: 400 });

    const holdError = validateHold({ onHold: Boolean(dates.onHoldSince), holdReason: texts.holdReason ?? "" });
    if (holdError) return Response.json({ error: holdError }, { status: 400 });

    if (prospectId) {
      const taken = await prisma.providerOnboarding.findUnique({ where: { prospectId }, select: { id: true } });
      if (taken) return Response.json({ error: "Ese prospecto ya tiene un alta en proceso.", id: taken.id }, { status: 409 });
    }

    const fullDocs = Object.fromEntries(ONBOARDING_DOCS.map((d) => [d.key, docs[d.key] ?? "pending"])) as DocRecord;
    const completedOn = completedOnAfterChange(fullDocs, dates.completedOn ? day(dates.completedOn) : null, companyDateKey(new Date()));

    const created = await prisma.providerOnboarding.create({
      data: {
        legalName: texts.legalName,
        commercialName: texts.commercialName,
        prospectId: prospectId ?? null,
        startedOn: dates.startedOn,
        ...fullDocs,
        completedOn: completedOn ? new Date(`${completedOn}T00:00:00.000Z`) : null,
        altaAuthorizedBy: texts.altaAuthorizedBy ?? null,
        contractStatus: contractStatus ?? "not_requested",
        legalRequestedOn: dates.legalRequestedOn ?? null,
        legalReceivedOn: dates.legalReceivedOn ?? null,
        sentToProviderOn: dates.sentToProviderOn ?? null,
        signedReceivedOn: dates.signedReceivedOn ?? null,
        contractAuthorizedBy: texts.contractAuthorizedBy ?? null,
        notes: texts.notes ?? null,
        purchasingNotes: texts.purchasingNotes ?? null,
        onHoldSince: dates.onHoldSince ?? null,
        holdReason: dates.onHoldSince ? texts.holdReason ?? null : null,
        createdById: session.user.id,
      },
      select: { id: true },
    });

    // El prospecto que dio origen pasa a "En proceso de alta" si iba antes.
    if (prospectId) {
      await prisma.providerProspect.updateMany({
        where: { id: prospectId, status: { in: ["pendiente", "prospectando", "negociando"] } },
        data: { status: "en_alta" },
      });
    }

    void logAudit({
      resource: "provider_onboarding",
      resourceId: created.id,
      resourceLabel: texts.legalName,
      action: "created",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ id: created.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[provider-onboardings] POST", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export { CONTRACT_STATUS_LABELS };
