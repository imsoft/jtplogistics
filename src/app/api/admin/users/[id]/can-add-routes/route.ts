import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { gateProviders } from "@/lib/provider-auth";
import { logAudit } from "@/lib/audit-log";

// PATCH — activa o desactiva el permiso de agregar rutas nuevas para un carrier
// body: { canAddRoutes: boolean }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, isCollaborator } = await gateProviders("canUpdateProviders");

    const { id } = await params;
    const { canAddRoutes }: { canAddRoutes: boolean } = await request.json();

    if (isCollaborator) {
      const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
      if (target?.role !== "carrier") {
        return Response.json({ error: "Solo aplicable a proveedores." }, { status: 403 });
      }
    }

    await prisma.user.update({
      where: { id },
      data: { canAddRoutes },
    });

    void logAudit({
      resource: "user_setting",
      resourceId: id,
      resourceLabel: "Permiso agregar rutas nuevas",
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
