import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import { hasModuleAccess } from "@/lib/module-access";

/**
 * GET /api/clients/:id/shipment-routes — las rutas asignadas al cliente, para
 * que el formulario de embarque solo ofrezca sus orígenes y destinos. Sin
 * tarifas. La lee quien ve Clientes o quien captura embarques (igual que las
 * direcciones del cliente).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const allowed =
      (await hasModuleAccess(session.user, "Clients", "view")) ||
      (await hasModuleAccess(session.user, "Shipments", "create")) ||
      (await hasModuleAccess(session.user, "Shipments", "update"));
    if (!allowed) return Response.json({ error: "Sin permiso" }, { status: 403 });
    const { id } = await params;
    const rows = await prisma.clientRoute.findMany({
      where: { clientId: id },
      select: { unitType: true, route: { select: { origin: true, destination: true, unitType: true } } },
    });
    return Response.json(
      rows.map((r) => ({ origin: r.route.origin, destination: r.route.destination, unitType: r.unitType || r.route.unitType }))
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[clients/:id/shipment-routes] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
