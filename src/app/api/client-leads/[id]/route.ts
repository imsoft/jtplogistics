import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { hasModuleAccess, requireModuleAccess } from "@/lib/module-access";
import { LEAD_STAGE_LABELS, requiresLostReason, type LeadStage } from "@/lib/client-leads";
import { LEADS_MODULE, LEAD_INCLUDE, isValidOwner, leadRfcError, leadToJson, quotesForLead, readLeadBody } from "@/lib/client-leads-server";

/** GET /api/client-leads/[id] — ficha con todas sus actividades y cotizaciones. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess(LEADS_MODULE, "view");
    const { id } = await params;
    const lead = await prisma.clientLead.findUnique({ where: { id }, include: LEAD_INCLUDE });
    if (!lead) return Response.json({ error: "No encontrado" }, { status: 404 });

    const [activities, quotes, canCreateClients] = await Promise.all([
      prisma.clientLeadActivity.findMany({
        where: { leadId: id },
        orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
        include: { author: { select: { name: true } } },
      }),
      quotesForLead([lead.companyName, lead.client?.name ?? ""]),
      hasModuleAccess(session.user, "Clients", "create"),
    ]);

    return Response.json({
      ...leadToJson(lead),
      activities: activities.map((a) => ({
        id: a.id,
        type: a.type,
        summary: a.summary,
        occurredOn: a.occurredOn.toISOString().slice(0, 10),
        authorId: a.authorId,
        authorName: a.author?.name ?? null,
        createdAt: a.createdAt.toISOString(),
      })),
      quotes,
      canCreateClients,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[client-leads/:id] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/**
 * PATCH /api/client-leads/[id]
 * Sirve para la ficha completa y para cambios sueltos desde la tabla (etapa,
 * responsable, próximo seguimiento). Perder exige motivo.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess(LEADS_MODULE, "update");
    const { id } = await params;
    const current = await prisma.clientLead.findUnique({ where: { id } });
    if (!current) return Response.json({ error: "No encontrado" }, { status: 404 });

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const data = readLeadBody(body);

    if (data.companyName === null) return Response.json({ error: "El nombre de la empresa no puede quedar vacío." }, { status: 400 });
    const rfcError = leadRfcError(data.rfc);
    if (rfcError) return Response.json({ error: rfcError }, { status: 400 });
    const nextStage = (data.stage ?? current.stage) as LeadStage;
    const lostReason = data.lostReason !== undefined ? data.lostReason : current.lostReason;
    if (requiresLostReason(nextStage) && !lostReason) {
      return Response.json({ error: "Escribe por qué se perdió." }, { status: 400 });
    }
    if (data.ownerId && data.ownerId !== current.ownerId && !(await isValidOwner(data.ownerId))) {
      return Response.json({ error: "El responsable no es válido." }, { status: 400 });
    }

    const updated = await prisma.clientLead.update({
      where: { id },
      data: {
        ...(data.companyName !== undefined && { companyName: data.companyName! }),
        ...(data.contactName !== undefined && { contactName: data.contactName }),
        ...(data.position !== undefined && { position: data.position }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.industry !== undefined && { industry: data.industry }),
        ...(data.rfc !== undefined && { rfc: data.rfc }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.lostReason !== undefined && { lostReason: data.lostReason }),
        ...(data.nextAction !== undefined && { nextAction: data.nextAction }),
        ...(data.nextFollowUpOn !== undefined && { nextFollowUpOn: data.nextFollowUpOn }),
        ...(data.estimatedMonthly !== undefined && { estimatedMonthly: data.estimatedMonthly }),
        ...(data.source !== undefined && { source: data.source as never }),
        ...(data.stage !== undefined && data.stage !== null && { stage: data.stage as never }),
        ...(data.ownerId !== undefined && { ownerId: data.ownerId }),
      },
      include: LEAD_INCLUDE,
    });

    const changes: { field: string; label: string; from: string | null; to: string | null }[] = [];
    if (updated.stage !== current.stage) {
      changes.push({
        field: "stage",
        label: "Etapa",
        from: LEAD_STAGE_LABELS[current.stage as LeadStage],
        to: LEAD_STAGE_LABELS[updated.stage as LeadStage] + (updated.stage === "perdido" && updated.lostReason ? `: ${updated.lostReason}` : ""),
      });
    }
    if (updated.ownerId !== current.ownerId) {
      changes.push({ field: "ownerId", label: "Responsable", from: null, to: updated.owner?.name ?? "Sin responsable" });
    }

    void logAudit({
      resource: "client_lead",
      resourceId: id,
      resourceLabel: updated.companyName,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
      changes,
    });

    return Response.json(leadToJson(updated));
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[client-leads/:id] PATCH", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess(LEADS_MODULE, "delete");
    const { id } = await params;
    const current = await prisma.clientLead.findUnique({ where: { id }, select: { companyName: true } });
    if (!current) return Response.json({ error: "No encontrado" }, { status: 404 });

    await prisma.clientLead.delete({ where: { id } });

    void logAudit({
      resource: "client_lead",
      resourceId: id,
      resourceLabel: current.companyName,
      action: "deleted",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[client-leads/:id] DELETE", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
