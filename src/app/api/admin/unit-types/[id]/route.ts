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

    const updated = await prisma.unitTypeDef.update({
      where: { id },
      data: { name },
    });

    void logAudit({
      resource: "unit_type",
      resourceId: updated.id,
      resourceLabel: updated.name,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ id: updated.id, name: updated.name, value: updated.value, createdAt: updated.createdAt.toISOString() });
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

    const existing = await prisma.unitTypeDef.findUnique({ where: { id } });

    const inUse = await prisma.route.findFirst({
      where: { unitType: existing?.value ?? "" },
    });
    if (inUse) {
      return Response.json({ error: "No se puede eliminar: hay rutas usando este tipo de unidad." }, { status: 409 });
    }

    await prisma.unitTypeDef.delete({ where: { id } });

    void logAudit({
      resource: "unit_type",
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
