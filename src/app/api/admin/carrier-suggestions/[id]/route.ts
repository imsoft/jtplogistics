import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { notify } from "@/lib/notify";
import { logAudit } from "@/lib/audit-log";
import { CARRIER_SUGGESTION_STATUSES } from "@/lib/constants/carrier-suggestion-status";

export function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async () => {
    const { id } = await params;
    const row = await prisma.carrierSuggestion.findUnique({
      where: { id },
      include: { carrier: { select: { name: true, email: true } } },
    });
    if (!row) return Response.json({ error: "No encontrado" }, { status: 404 });
    return Response.json({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      carrierId: row.carrierId,
      carrierName: row.carrier.name,
      carrierEmail: row.carrier.email,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  });
}

export function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async (session) => {
    const { id } = await params;
    const body = await request.json();
    const { status } = body as { status?: string };

    const row = await prisma.carrierSuggestion.findUnique({ where: { id } });
    if (!row) return Response.json({ error: "No encontrado" }, { status: 404 });

    if (status === undefined) {
      return Response.json({ error: "No hay cambios" }, { status: 400 });
    }

    if (!CARRIER_SUGGESTION_STATUSES.includes(status as (typeof CARRIER_SUGGESTION_STATUSES)[number])) {
      return Response.json({ error: "Estado inválido" }, { status: 400 });
    }

    const prevStatus = row.status;
    await prisma.carrierSuggestion.update({
      where: { id },
      data: { status },
    });

    if (status !== prevStatus && status !== "pending") {
      const label =
        status === "in_review"
          ? "en revisión"
          : status === "resolved"
            ? "marcada como resuelta"
            : "actualizada";
      void notify({
        userId: row.carrierId,
        type: "carrier_suggestion_status",
        title: `Tu sugerencia fue ${label}`,
        body: row.title.slice(0, 80),
        href: "/carrier/dashboard/suggestions",
      });
    }

    void logAudit({
      resource: "carrier_suggestion",
      resourceId: id,
      resourceLabel: row.title,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ ok: true });
  });
}

export function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async (session) => {
    const { id } = await params;
    const row = await prisma.carrierSuggestion.findUnique({ where: { id } });
    if (!row) return Response.json({ error: "No encontrado" }, { status: 404 });

    await prisma.carrierSuggestion.delete({ where: { id } });

    void logAudit({
      resource: "carrier_suggestion",
      resourceId: id,
      resourceLabel: row.title,
      action: "deleted",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ ok: true });
  });
}
