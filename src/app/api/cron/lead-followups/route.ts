import { prisma } from "@/lib/db";
import { cronUnauthorized, ranRecently } from "@/lib/cron-auth";
import { notify } from "@/lib/notify";
import { companyDateKey } from "@/lib/time-clock";
import { dashboardPrefix } from "@/lib/mural-notify";

export const dynamic = "force-dynamic";

/**
 * Recordatorio diario de Prospección de clientes y de proveedores: a cada
 * responsable le llega una notificación por cada prospecto abierto con
 * seguimiento para hoy o vencido. Sin responsable, le llega a quien lo
 * registró. La notificación abre la ficha del prospecto en su tabla.
 *
 * Se protege con CRON_SECRET.
 */
export async function GET(request: Request) {
  const denied = cronUnauthorized(request);
  if (denied) return denied;

  try {
    if (await ranRecently("client_lead_followup")) return Response.json({ skipped: "ya se envió hoy" });
    const today = companyDateKey();
    const dueBy = new Date(`${today}T00:00:00.000Z`);
    const person = { select: { id: true, role: true, offboardedOn: true } } as const;
    const [leads, prospects] = await Promise.all([
      prisma.clientLead.findMany({
        where: { stage: { notIn: ["ganado", "perdido"] }, nextFollowUpOn: { lte: dueBy } },
        select: { id: true, companyName: true, nextAction: true, nextFollowUpOn: true, owner: person, createdBy: person },
      }),
      prisma.providerProspect.findMany({
        where: { status: { notIn: ["listo", "descartado"] }, nextFollowUpOn: { lte: dueBy } },
        select: { id: true, commercialName: true, nextAction: true, nextFollowUpOn: true, owner: person, createdBy: person },
      }),
    ]);

    type Person = { id: string; role: string; offboardedOn: Date | null } | null;
    const reminder = (
      item: { id: string; name: string; nextAction: string | null; nextFollowUpOn: Date | null; owner: Person; createdBy: Person },
      type: string,
      page: string
    ) => {
      const who = item.owner && !item.owner.offboardedOn ? item.owner : item.createdBy && !item.createdBy.offboardedOn ? item.createdBy : null;
      if (!who) return [];
      const overdue = item.nextFollowUpOn!.toISOString().slice(0, 10) < today;
      return [
        {
          userId: who.id,
          type,
          title: `${overdue ? "Seguimiento vencido" : "Seguimiento para hoy"}: ${item.name}`,
          body: item.nextAction ?? undefined,
          href: `${dashboardPrefix(who.role)}/dashboard/${page}?ficha=${item.id}`,
        },
      ];
    };

    const inputs = [
      ...leads.flatMap((l) => reminder({ ...l, name: l.companyName }, "client_lead_followup", "client-leads")),
      ...prospects.flatMap((p) => reminder({ ...p, name: p.commercialName }, "provider_prospect_followup", "prospects")),
    ];

    if (inputs.length > 0) await notify(inputs);
    return Response.json({ leads: leads.length, prospects: prospects.length, notified: inputs.length });
  } catch (e) {
    console.error("[cron/lead-followups]", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
