import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit-log";

// PATCH /api/admin/carrier-routes/[id]
// body: { approved: boolean }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
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

    await prisma.carrierRoute.update({
      where: { id },
      data: {
        editUnlockApproved: approved,
        editUnlockRequested: false,
      },
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
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
