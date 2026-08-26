import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireDeveloper } from "@/lib/auth-server";
import { notify } from "@/lib/notify";
import { logAudit } from "@/lib/audit-log";
import type { TicketStatus } from "@prisma/client";

const STATUSES = ["open", "in_progress", "resolved"];

/** PATCH: mover el reporte de estado y dejar cómo se resolvió. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireDeveloper();
    const { id } = await params;
    const body = (await request.json()) as { status?: string; resolution?: string | null };

    if (body.status && !STATUSES.includes(body.status)) {
      return Response.json({ error: "Estado inválido" }, { status: 400 });
    }

    const current = await prisma.supportTicket.findUnique({ where: { id } });
    if (!current) return Response.json({ error: "No encontrado" }, { status: 404 });

    const resolving = body.status === "resolved" && current.status !== "resolved";

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status as TicketStatus }),
        ...(body.resolution !== undefined && { resolution: body.resolution?.trim() || null }),
        ...(resolving && { resolvedAt: new Date() }),
      },
      include: { reporter: { select: { id: true, name: true, role: true } } },
    });

    // Quien reportó se entera del avance sin tener que preguntar.
    if (body.status && body.status !== current.status) {
      const prefix = ticket.reporter.role === "admin" ? "/admin" : ticket.reporter.role === "vendor" ? "/vendor" : "/collaborator";
      void notify({
        userId: ticket.reporterId,
        type: "support_ticket_update",
        title: resolving ? `Resuelto: ${ticket.title.slice(0, 55)}` : `Tu reporte está en proceso`,
        body: ticket.resolution ?? undefined,
        href: `${prefix}/dashboard/support`,
      });
    }

    void logAudit({
      resource: "support_ticket", resourceId: ticket.id, resourceLabel: ticket.title,
      action: "updated", userId: session.user.id, userName: session.user.name,
    });

    return Response.json(ticket);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[developer/tickets] PATCH", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
