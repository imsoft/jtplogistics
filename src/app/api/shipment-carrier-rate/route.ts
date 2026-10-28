import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import { canManageTariffs } from "@/lib/shipment-tariffs";

/**
 * GET /api/shipment-carrier-rate?carrierId=&origin=&destination=&unitType=
 * Lo que el transportista tiene pactado para esa ruta (su target): el
 * formulario de embarque lo propone como tarifa de compra. Solo para quien
 * ve tarifas.
 */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const me =
      session.user.role === "collaborator"
        ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { canViewFinances: true } })
        : null;
    if (!canManageTariffs(session.user, me)) return Response.json({ error: "Sin permiso" }, { status: 403 });

    const sp = new URL(req.url).searchParams;
    const carrierId = sp.get("carrierId") ?? "";
    const origin = (sp.get("origin") ?? "").trim();
    const destination = (sp.get("destination") ?? "").trim();
    const unitType = (sp.get("unitType") ?? "").trim();
    if (!carrierId || !origin || !destination) return Response.json({ cost: null });

    const rows = await prisma.carrierRoute.findMany({
      where: {
        carrierId,
        carrierTarget: { not: null },
        route: { origin: { equals: origin, mode: "insensitive" }, destination: { equals: destination, mode: "insensitive" } },
      },
      select: { unitType: true, carrierTarget: true, route: { select: { unitType: true } } },
    });
    // Mismo tipo de unidad si se eligió; si no, el primero que haya.
    const best = rows.find((r) => unitType && (r.unitType || r.route.unitType) === unitType) ?? (unitType ? null : rows[0]);
    return Response.json({ cost: best?.carrierTarget ?? null });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[shipment-carrier-rate]", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
