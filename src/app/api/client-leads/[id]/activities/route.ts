import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { requireModuleAccess } from "@/lib/module-access";
import { companyDateKey } from "@/lib/time-clock";
import { LEAD_ACTIVITY_LABELS, LEAD_STAGE_VALUES, isLeadActivityType, type LeadStage } from "@/lib/client-leads";
import { LEADS_MODULE, readDate } from "@/lib/client-leads-server";

/**
 * Hasta dónde avanza la etapa una actividad. Solo empuja hacia adelante: una
 * llamada no regresa a "contactado" a quien ya está en negociación, y una
 * nota no cuenta como contacto.
 */
function stageAfterActivity(stage: LeadStage, type: string): LeadStage {
  const order = LEAD_STAGE_VALUES;
  const target: LeadStage | null = type === "cotizacion" ? "cotizado" : type === "nota" ? null : "contactado";
  if (!target || stage === "ganado" || stage === "perdido") return stage;
  return order.indexOf(target) > order.indexOf(stage) ? target : stage;
}

/**
 * POST /api/client-leads/[id]/activities
 * Registra lo que se hizo y, de una vez, el próximo seguimiento.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess(LEADS_MODULE, "update");
    const { id } = await params;
    const lead = await prisma.clientLead.findUnique({ where: { id }, select: { id: true, stage: true, companyName: true } });
    if (!lead) return Response.json({ error: "No encontrado" }, { status: 404 });

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (!isLeadActivityType(body.type)) return Response.json({ error: "Elige qué se hizo." }, { status: 400 });
    const summary = typeof body.summary === "string" ? body.summary.trim() : "";
    if (summary.length < 3) return Response.json({ error: "Escribe qué pasó." }, { status: 400 });

    const today = companyDateKey();
    const occurredOn = readDate(body.occurredOn) ?? new Date(`${today}T00:00:00.000Z`);
    if (occurredOn.toISOString().slice(0, 10) > today) {
      return Response.json({ error: "La fecha no puede ser futura: para eso está el próximo seguimiento." }, { status: 400 });
    }
    const nextFollowUpOn = readDate(body.nextFollowUpOn);
    const nextAction =
      typeof body.nextAction === "string" ? body.nextAction.trim() || null : body.nextAction === null ? null : undefined;

    const newStage = stageAfterActivity(lead.stage as LeadStage, body.type);

    const [activity] = await prisma.$transaction([
      prisma.clientLeadActivity.create({
        data: { leadId: id, type: body.type, summary, occurredOn, authorId: session.user.id },
      }),
      prisma.clientLead.update({
        where: { id },
        data: {
          ...(newStage !== lead.stage && { stage: newStage }),
          ...(nextFollowUpOn !== undefined && { nextFollowUpOn }),
          ...(nextAction !== undefined && { nextAction }),
        },
      }),
    ]);

    void logAudit({
      resource: "client_lead",
      resourceId: id,
      resourceLabel: lead.companyName,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
      changes: [{ field: "activity", label: "Actividad", from: null, to: `${LEAD_ACTIVITY_LABELS[body.type]}: ${summary}` }],
    });

    return Response.json({ id: activity.id, stage: newStage }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[client-leads/:id/activities] POST", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
