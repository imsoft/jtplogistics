import { prisma } from "@/lib/db";
import { carrierHandler } from "@/lib/api-handler";
import { logAudit } from "@/lib/audit-log";

export function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return carrierHandler(async (session) => {
    const { id } = await params;
    const row = await prisma.carrierSuggestion.findFirst({
      where: { id, carrierId: session.user.id },
    });
    if (!row) return Response.json({ error: "No encontrado" }, { status: 404 });
    return Response.json({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      carrierId: row.carrierId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  });
}

export function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return carrierHandler(async (session) => {
    const { id } = await params;
    const body = await request.json();
    const { title, description } = body as { title?: string; description?: string };

    const row = await prisma.carrierSuggestion.findFirst({
      where: { id, carrierId: session.user.id },
    });
    if (!row) return Response.json({ error: "No encontrado" }, { status: 404 });

    if (row.status !== "pending") {
      return Response.json(
        { error: "Solo puedes editar sugerencias pendientes de revisión." },
        { status: 403 }
      );
    }

    if (title !== undefined && !String(title).trim()) {
      return Response.json({ error: "El título no puede quedar vacío" }, { status: 400 });
    }

    const updated = await prisma.carrierSuggestion.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
      },
    });

    void logAudit({
      resource: "carrier_suggestion",
      resourceId: id,
      resourceLabel: updated.title,
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
  return carrierHandler(async (session) => {
    const { id } = await params;
    const row = await prisma.carrierSuggestion.findFirst({
      where: { id, carrierId: session.user.id },
    });
    if (!row) return Response.json({ error: "No encontrado" }, { status: 404 });

    if (row.status !== "pending") {
      return Response.json(
        { error: "Solo puedes eliminar sugerencias pendientes de revisión." },
        { status: 403 }
      );
    }

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
