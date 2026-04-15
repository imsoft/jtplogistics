import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireCarrier } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit-log";

export async function POST(request: NextRequest) {
  try {
    const session = await requireCarrier();
    const body = await request.json();
    const { routeId, unitType } = body as { routeId?: string; unitType?: string };

    if (!routeId || !unitType) {
      return Response.json({ error: "routeId y unitType son requeridos" }, { status: 400 });
    }

    // Find the carrier route record
    const carrierRoute = await prisma.carrierRoute.findUnique({
      where: { carrierId_routeId_unitType: { carrierId: session.user.id, routeId, unitType } },
      include: { route: { select: { origin: true, destination: true } } },
    });

    if (!carrierRoute) {
      return Response.json({ error: "Ruta no encontrada" }, { status: 404 });
    }

    // Mark as requested
    await prisma.carrierRoute.update({
      where: { id: carrierRoute.id },
      data: { editUnlockRequested: true },
    });

    // Notify all admins
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true },
    });

    if (admins.length > 0) {
      const routeLabel = `${carrierRoute.route.origin} → ${carrierRoute.route.destination} (${unitType})`;
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: "carrier_unlock_request",
          title: "Solicitud de edición de ruta",
          body: `${(session.user as { name: string }).name} solicita editar: ${routeLabel}.`,
          href: `/admin/dashboard/users/${session.user.id}`,
          read: false,
        })),
      });
    }

    void logAudit({
      resource: "carrier_route_unlock_request",
      resourceId: carrierRoute.id,
      resourceLabel: `${carrierRoute.route.origin} → ${carrierRoute.route.destination}`,
      action: "created",
      userId: session.user.id,
      userName: (session.user as { name: string }).name,
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
