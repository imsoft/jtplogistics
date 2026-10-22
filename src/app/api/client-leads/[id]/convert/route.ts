import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { hasModuleAccess, requireModuleAccess } from "@/lib/module-access";
import { LEADS_MODULE } from "@/lib/client-leads-server";

/**
 * POST /api/client-leads/[id]/convert
 * Da de alta al prospecto como cliente del catálogo (o lo liga a uno que ya
 * existe con `clientId`) y lo marca ganado. Así el cliente se captura una sola
 * vez y de ahí lo toman los cotizadores.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess(LEADS_MODULE, "update");
    const { id } = await params;
    const lead = await prisma.clientLead.findUnique({ where: { id } });
    if (!lead) return Response.json({ error: "No encontrado" }, { status: 404 });
    if (lead.clientId) return Response.json({ clientId: lead.clientId });

    const body = (await request.json().catch(() => ({}))) as { clientId?: unknown };
    let clientId: string;

    if (typeof body.clientId === "string" && body.clientId) {
      const existing = await prisma.client.findUnique({ where: { id: body.clientId }, select: { id: true } });
      if (!existing) return Response.json({ error: "Ese cliente no existe." }, { status: 400 });
      clientId = existing.id;
    } else {
      if (!(await hasModuleAccess(session.user, "Clients", "create"))) {
        return Response.json({ error: "Necesitas permiso para crear clientes." }, { status: 403 });
      }
      const client = await prisma.client.create({
        data: {
          name: lead.companyName,
          contactName: lead.contactName,
          position: lead.position,
          email: lead.email,
          phone: lead.phone,
          notes: lead.notes,
        },
        select: { id: true },
      });
      clientId = client.id;
      void logAudit({
        resource: "client",
        resourceId: client.id,
        resourceLabel: lead.companyName,
        action: "created",
        userId: session.user.id,
        userName: session.user.name,
        changes: [{ field: "origin", label: "Origen", from: null, to: "CRM de clientes" }],
      });
    }

    await prisma.clientLead.update({ where: { id }, data: { clientId, stage: "ganado" } });

    void logAudit({
      resource: "client_lead",
      resourceId: id,
      resourceLabel: lead.companyName,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
      changes: [{ field: "stage", label: "Etapa", from: lead.stage, to: "Ganado (cliente dado de alta)" }],
    });

    return Response.json({ clientId }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[client-leads/:id/convert] POST", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
