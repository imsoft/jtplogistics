import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit-log";

// PATCH — activa o desactiva el permiso de editar rutas para un carrier
// body: { canEditRoutes: boolean }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();

    const { id } = await params;
    const { canEditRoutes }: { canEditRoutes: boolean } = await request.json();

    await prisma.user.update({
      where: { id },
      data: {
        canEditRoutes,
        // When enabling route editing, also enable target editing
        ...(canEditRoutes ? { canEditTarget: true } : { canEditTarget: false }),
      },
    });

    void logAudit({
      resource: "user_setting",
      resourceId: id,
      resourceLabel: "Permiso editar rutas",
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
