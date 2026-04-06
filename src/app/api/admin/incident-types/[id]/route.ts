import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit-log";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const name = body.name ? String(body.name).trim() : undefined;

    if (!name) return Response.json({ error: "El nombre es requerido" }, { status: 400 });

    const updated = await prisma.incidentTypeDef.update({
      where: { id },
      data: { name },
    });

    void logAudit({
      resource: "incident_type",
      resourceId: updated.id,
      resourceLabel: updated.name,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({
      id: updated.id,
      name: updated.name,
      value: updated.value,
      sortOrder: updated.sortOrder,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (e) {
    if (e instanceof Response) throw e;
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const existing = await prisma.incidentTypeDef.findUnique({ where: { id } });
    const val = existing?.value ?? "";

    const inShipments = await prisma.shipment.findFirst({
      where: { incidentType: val },
    });
    if (inShipments) {
      return Response.json(
        { error: "No se puede eliminar: hay embarques usando este tipo de incidencia." },
        { status: 409 }
      );
    }

    const inFinances = await prisma.finance.findFirst({
      where: { incidentType: val },
    });
    if (inFinances) {
      return Response.json(
        { error: "No se puede eliminar: hay registros de finanzas usando este tipo de incidencia." },
        { status: 409 }
      );
    }

    await prisma.incidentTypeDef.delete({ where: { id } });

    void logAudit({
      resource: "incident_type",
      resourceId: id,
      resourceLabel: existing?.name ?? id,
      action: "deleted",
      userId: session.user.id,
      userName: session.user.name,
    });

    return new Response(null, { status: 204 });
  } catch (e) {
    if (e instanceof Response) throw e;
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
