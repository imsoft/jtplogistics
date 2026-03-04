import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";

// PATCH — activa o desactiva el permiso de editar rutas para un carrier
// body: { canEditRoutes: boolean }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const { canEditRoutes }: { canEditRoutes: boolean } = await request.json();

    await prisma.user.update({
      where: { id },
      data: { canEditRoutes },
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
