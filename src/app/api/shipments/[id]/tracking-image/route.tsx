import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import { renderTrackingImage } from "@/lib/tracking-image";

/**
 * GET /api/shipments/:id/tracking-image — imagen cuadrada de seguimiento
 * (ver lib/tracking-image.tsx). La ven dirección, soporte de TI y
 * colaboradores con permiso de ver embarques.
 */

async function canSee(): Promise<boolean> {
  const session = await requireSession();
  const role = session.user.role;
  if (role === "admin" || role === "developer") return true;
  if (role !== "collaborator") return false;
  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { canViewShipments: true } });
  return Boolean(me?.canViewShipments);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await canSee())) return Response.json({ error: "Sin permiso" }, { status: 403 });
    const { id } = await params;
    const image = await renderTrackingImage(id, request.url);
    return image ?? Response.json({ error: "No encontrado" }, { status: 404 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "No se pudo generar la imagen." }, { status: 500 });
  }
}
