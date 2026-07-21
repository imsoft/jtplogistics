import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit-log";

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const { carrierRouteId } = await request.json();

    if (!carrierRouteId) {
      return Response.json({ error: "ID requerido" }, { status: 400 });
    }

    const carrierRoute = await prisma.carrierRoute.findUnique({
      where: { id: carrierRouteId },
      include: {
        carrier: { select: { id: true, name: true } },
        route: { select: { id: true, origin: true, destination: true } },
      },
    });

    if (!carrierRoute) {
      return Response.json({ error: "Ruta no encontrada" }, { status: 404 });
    }

    await prisma.carrierRoute.delete({ where: { id: carrierRouteId } });

    const routeLabel = `${carrierRoute.route.origin} → ${carrierRoute.route.destination}`;
    void logAudit({
      resource: "carrier_route",
      resourceId: carrierRouteId,
      resourceLabel: `${routeLabel} (${carrierRoute.carrier.name})`,
      action: "deleted",
      userId: session.user.id,
      userName: (session.user as { name: string }).name,
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Error al desvincular ruta:", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
