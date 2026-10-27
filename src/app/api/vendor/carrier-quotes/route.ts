import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireVendedor } from "@/lib/auth-server";
import { suggestedQuotePrice, vendorCommissionSummary } from "@/lib/vendor-pricing";

/**
 * Cotizador del vendedor. No ve targets (de los transportistas ni de la ruta)
 * ni los datos de contacto de los transportistas: solo las rutas y, al elegir
 * una, el precio sugerido y el resumen de su comisión ya calculados.
 */
export async function GET(request: NextRequest) {
  try {
    await requireVendedor();

    const { searchParams } = new URL(request.url);
    const routeId = searchParams.get("routeId");

    // Se listan TODAS las rutas (activas, pendientes e inactivas): se puede
    // cotizar cualquier trayecto.
    const routes = await prisma.route.findMany({
      select: {
        id: true,
        origin: true,
        destination: true,
        destinationState: true,
        status: true,
        unitType: true,
      },
      orderBy: [{ origin: "asc" }, { destination: "asc" }],
    });

    if (!routeId) {
      return Response.json({ routes, carriers: [], restricted: true, suggestedPrice: null, summary: null });
    }

    const [route, carrierRoutes] = await Promise.all([
      prisma.route.findUnique({ where: { id: routeId }, select: { target: true } }),
      prisma.carrierRoute.findMany({ where: { routeId, carrierTarget: { not: null } }, select: { carrierTarget: true } }),
    ]);
    const targets = carrierRoutes.map((cr) => cr.carrierTarget).filter((t): t is number => t != null);

    return Response.json({
      routes,
      carriers: [],
      restricted: true,
      suggestedPrice: suggestedQuotePrice(targets, route?.target ?? null),
      summary: vendorCommissionSummary(targets),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
