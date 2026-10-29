import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit-log";
import { isIncidentColor } from "@/lib/constants/incident-colors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const name = body.name !== undefined ? String(body.name ?? "").trim() : undefined;
    // Color de la insignia: una clave de la gama, o null para quitarlo.
    const color = body.color === null ? null : isIncidentColor(body.color) ? body.color : undefined;

    if (name === "") return Response.json({ error: "El nombre es requerido" }, { status: 400 });
    if (name === undefined && color === undefined) return Response.json({ error: "Nada que cambiar" }, { status: 400 });

    const updated = await prisma.incidentTypeDef.update({
      where: { id },
      data: { ...(name !== undefined && { name }), ...(color !== undefined && { color }) },
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
      color: updated.color,
      value: updated.value,
      sortOrder: updated.sortOrder,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (e) {
    if (e instanceof Response) return e;
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
    if (e instanceof Response) return e;
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
