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
    const linkTo = typeof body.clientId === "string" && body.clientId ? body.clientId : null;

    if (linkTo) {
      const existing = await prisma.client.findUnique({ where: { id: linkTo }, select: { id: true } });
      if (!existing) return Response.json({ error: "Ese cliente no existe." }, { status: 400 });
    } else {
      if (!(await hasModuleAccess(session.user, "Clients", "create"))) {
        return Response.json({ error: "Necesitas permiso para crear clientes." }, { status: 403 });
      }
      // Si ya está en el catálogo, se liga en lugar de duplicarlo.
      const sameName = await prisma.client.findFirst({
        where: { OR: [{ name: { equals: lead.companyName, mode: "insensitive" } }, { legalName: { equals: lead.companyName, mode: "insensitive" } }] },
        select: { id: true, name: true },
      });
      if (sameName) {
        return Response.json(
          { error: `Ya existe el cliente "${sameName.name}". Lígalo en lugar de crear otro.`, clientId: sameName.id, code: "CLIENT_EXISTS" },
          { status: 409 }
        );
      }
    }

    // Con el prospecto bloqueado: un doble clic no crea dos clientes.
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM client_leads WHERE id = ${id} FOR UPDATE`;
      const fresh = await tx.clientLead.findUnique({ where: { id }, select: { clientId: true } });
      if (fresh?.clientId) return { clientId: fresh.clientId, created: false };
      const clientId = linkTo
        ? linkTo
        : (
            await tx.client.create({
              data: {
                name: lead.companyName,
                contactName: lead.contactName,
                position: lead.position,
                email: lead.email,
                phone: lead.phone,
                notes: lead.notes,
              },
              select: { id: true },
            })
          ).id;
      await tx.clientLead.update({ where: { id }, data: { clientId, stage: "ganado" } });
      return { clientId, created: !linkTo };
    });
    if (!result.created && !linkTo && result.clientId) {
      // Otra petición ya lo había convertido.
      return Response.json({ clientId: result.clientId });
    }
    const clientId = result.clientId;
    if (result.created) {
      void logAudit({
        resource: "client",
        resourceId: clientId,
        resourceLabel: lead.companyName,
        action: "created",
        userId: session.user.id,
        userName: session.user.name,
        changes: [{ field: "origin", label: "Origen", from: null, to: "CRM de clientes" }],
      });
    }

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
