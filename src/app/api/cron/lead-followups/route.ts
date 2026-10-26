import { prisma } from "@/lib/db";
import { cronUnauthorized } from "@/lib/cron-auth";
import { notify } from "@/lib/notify";
import { companyDateKey } from "@/lib/time-clock";
import { dashboardPrefix } from "@/lib/mural-notify";

export const dynamic = "force-dynamic";

/**
 * Recordatorio diario del CRM de clientes: a cada responsable le llega una
 * notificación por cada prospecto abierto con seguimiento para hoy o vencido.
 * Sin responsable, le llega a quien lo registró.
 *
 * Se protege con CRON_SECRET.
 */
export async function GET(request: Request) {
  const denied = cronUnauthorized(request);
  if (denied) return denied;

  try {
    const today = companyDateKey();
    const leads = await prisma.clientLead.findMany({
      where: {
        stage: { notIn: ["ganado", "perdido"] },
        nextFollowUpOn: { lte: new Date(`${today}T00:00:00.000Z`) },
      },
      select: {
        id: true,
        companyName: true,
        nextAction: true,
        nextFollowUpOn: true,
        owner: { select: { id: true, role: true, offboardedOn: true } },
        createdBy: { select: { id: true, role: true, offboardedOn: true } },
      },
    });

    const inputs = leads.flatMap((l) => {
      const who = l.owner && !l.owner.offboardedOn ? l.owner : l.createdBy && !l.createdBy.offboardedOn ? l.createdBy : null;
      if (!who) return [];
      const due = l.nextFollowUpOn!.toISOString().slice(0, 10);
      const overdue = due < today;
      return [
        {
          userId: who.id,
          type: "client_lead_followup",
          title: `${overdue ? "Seguimiento vencido" : "Seguimiento para hoy"}: ${l.companyName}`,
          body: l.nextAction ?? undefined,
          href: `${dashboardPrefix(who.role)}/dashboard/client-leads/${l.id}`,
        },
      ];
    });

    if (inputs.length > 0) await notify(inputs);
    return Response.json({ leads: leads.length, notified: inputs.length });
  } catch (e) {
    console.error("[cron/lead-followups]", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
