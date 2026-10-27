import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { gateProviders } from "@/lib/provider-auth";
import { logAudit } from "@/lib/audit-log";

// PATCH /api/admin/carrier-routes/[id]
// body: { approved: boolean }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session } = await gateProviders("canUpdateProviders");
    const { id } = await params;
    const body = await request.json();
    const approved = Boolean(body?.approved);

    const carrierRoute = await prisma.carrierRoute.findUnique({
      where: { id },
      include: {
        carrier: { select: { id: true, name: true } },
        route: { select: { origin: true, destination: true } },
      },
    });

    if (!carrierRoute) {
      return Response.json({ error: "Ruta no encontrada" }, { status: 404 });
    }

    const routeLabel = `${carrierRoute.route.origin} → ${carrierRoute.route.destination}`;

    await prisma.$transaction([
      prisma.carrierRoute.update({
        where: { id },
        data: {
          editUnlockApproved: approved,
          editUnlockRequested: false,
        },
      }),
    ]);

    // Avisa a la empresa: al principal y a sus usuarios que capturan tarifas
    // (cualquiera de ellos pudo haber pedido el desbloqueo).
    const members = await prisma.user.findMany({
      where: { parentCarrierId: carrierRoute.carrier.id, memberCanEditRates: true, memberRevokedAt: null },
      select: { id: true },
    });
    await prisma.notification.createMany({
      data: [carrierRoute.carrier.id, ...members.map((m) => m.id)].map((userId) => ({
        userId,
        type: "carrier_unlock_response",
        title: approved ? "Edición de ruta aprobada" : "Solicitud de edición rechazada",
        body: approved
          ? `Tu solicitud para editar la ruta ${routeLabel} fue aprobada. Ya puedes modificarla.`
          : `Tu solicitud para editar la ruta ${routeLabel} fue rechazada.`,
        href: `/carrier/dashboard/unit-types/${carrierRoute.unitType}`,
        read: false,
      })),
    });

    void logAudit({
      resource: "carrier_route_unlock",
      resourceId: id,
      resourceLabel: `${carrierRoute.route.origin} → ${carrierRoute.route.destination} (${carrierRoute.carrier.name})`,
      action: approved ? "updated" : "deleted",
      userId: (session.user as { id: string }).id,
      userName: (session.user as { name: string }).name,
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
