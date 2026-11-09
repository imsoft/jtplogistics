import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { requireProspectAccess } from "@/lib/prospect-auth";
import { companyDateKey } from "@/lib/time-clock";
import { LEAD_ACTIVITY_LABELS, isLeadActivityType } from "@/lib/client-leads";
import { readDate } from "@/lib/client-leads-server";
import { prospectStatusAfterActivity, type ProspectStatus } from "@/lib/provider-prospects";

/**
 * POST /api/provider-prospects/[id]/activities
 * Igual que en clientes: registra lo que se hizo y, de una vez, el próximo
 * seguimiento.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireProspectAccess("update");
    const { id } = await params;
    const prospect = await prisma.providerProspect.findUnique({ where: { id }, select: { id: true, status: true, commercialName: true } });
    if (!prospect) return Response.json({ error: "No encontrado" }, { status: 404 });

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

    const newStatus = prospectStatusAfterActivity(prospect.status as ProspectStatus, body.type);

    const [activity] = await prisma.$transaction([
      prisma.providerProspectActivity.create({
        data: { prospectId: id, type: body.type, summary, occurredOn, authorId: session.user.id },
      }),
      prisma.providerProspect.update({
        where: { id },
        data: {
          ...(newStatus !== prospect.status && { status: newStatus }),
          ...(nextFollowUpOn !== undefined && { nextFollowUpOn }),
          ...(nextAction !== undefined && { nextAction }),
        },
      }),
    ]);

    void logAudit({
      resource: "provider_prospect",
      resourceId: id,
      resourceLabel: prospect.commercialName,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
      changes: [{ field: "activity", label: "Actividad", from: null, to: `${LEAD_ACTIVITY_LABELS[body.type]}: ${summary}` }],
    });

    return Response.json({ id: activity.id, status: newStatus }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[provider-prospects/:id/activities] POST", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
