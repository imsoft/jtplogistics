import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { requireModuleAccess } from "@/lib/module-access";
import { companyDateKey } from "@/lib/time-clock";
import { LEAD_STAGE_LABELS, isLeadStage, requiresLostReason, type LeadStage } from "@/lib/client-leads";
import { LEADS_MODULE, LEAD_INCLUDE, isValidOwner, leadToJson, readLeadBody } from "@/lib/client-leads-server";

const SEARCH_FIELDS = ["companyName", "contactName", "phone", "email", "city", "industry", "notes"] as const;

/**
 * GET /api/client-leads?q=&stage=&owner=&followUp=pendiente
 * followUp=pendiente: solo los abiertos con seguimiento para hoy o vencido.
 */
export async function GET(request: Request) {
  try {
    await requireModuleAccess(LEADS_MODULE, "view");
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    const stage = searchParams.get("stage");
    const owner = searchParams.get("owner");

    const where: Prisma.ClientLeadWhereInput = {};
    if (isLeadStage(stage)) where.stage = stage;
    if (owner) where.ownerId = owner === "none" ? null : owner;
    if (searchParams.get("followUp") === "pendiente") {
      where.stage = { notIn: ["ganado", "perdido"] };
      where.nextFollowUpOn = { lte: new Date(`${companyDateKey()}T00:00:00.000Z`) };
    }
    if (q) {
      where.OR = SEARCH_FIELDS.map((f) => ({ [f]: { contains: q, mode: "insensitive" as Prisma.QueryMode } }));
    }

    const leads = await prisma.clientLead.findMany({ where, orderBy: { updatedAt: "desc" }, include: LEAD_INCLUDE });
    return Response.json(leads.map(leadToJson));
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[client-leads] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/** POST /api/client-leads */
export async function POST(request: Request) {
  try {
    const session = await requireModuleAccess(LEADS_MODULE, "create");
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const data = readLeadBody(body);

    if (!data.companyName) return Response.json({ error: "Escribe el nombre de la empresa." }, { status: 400 });
    const stage = (data.stage ?? "prospecto") as LeadStage;
    if (requiresLostReason(stage) && !data.lostReason) {
      return Response.json({ error: "Escribe por qué se perdió." }, { status: 400 });
    }
    // Si no se elige responsable, el prospecto queda a cargo de quien lo registra.
    const ownerId = data.ownerId ?? session.user.id;
    if (data.ownerId && !(await isValidOwner(data.ownerId))) {
      return Response.json({ error: "El responsable no es válido." }, { status: 400 });
    }

    const created = await prisma.clientLead.create({
      data: {
        companyName: data.companyName,
        contactName: data.contactName ?? null,
        position: data.position ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        city: data.city ?? null,
        industry: data.industry ?? null,
        notes: data.notes ?? null,
        lostReason: data.lostReason ?? null,
        nextAction: data.nextAction ?? null,
        nextFollowUpOn: data.nextFollowUpOn ?? null,
        estimatedMonthly: data.estimatedMonthly ?? null,
        ...(data.source ? { source: data.source as never } : {}),
        stage,
        ownerId,
        createdById: session.user.id,
      },
      select: { id: true },
    });

    void logAudit({
      resource: "client_lead",
      resourceId: created.id,
      resourceLabel: data.companyName,
      action: "created",
      userId: session.user.id,
      userName: session.user.name,
      changes: [{ field: "stage", label: "Etapa", from: null, to: LEAD_STAGE_LABELS[stage] }],
    });

    return Response.json({ id: created.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[client-leads] POST", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
