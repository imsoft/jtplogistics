import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireVendedor } from "@/lib/auth-server";

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
        target: true,
        status: true,
        unitType: true,
      },
      orderBy: [{ origin: "asc" }, { destination: "asc" }],
    });

    if (!routeId) {
      return Response.json({ routes, carriers: [], targets: [] });
    }

    const carrierRoutes = await prisma.carrierRoute.findMany({
      where: { routeId },
      include: {
        carrier: {
          select: {
            name: true,
            email: true,
            profile: {
              select: {
                commercialName: true,
                contacts: { select: { type: true, value: true }, where: { type: "phone" } },
              },
            },
          },
        },
      },
      orderBy: { carrierTarget: "asc" },
    });

    const carriers = carrierRoutes.map((cr) => ({
      id: cr.id,
      carrierId: cr.carrierId,
      name: cr.carrier.name,
      email: cr.carrier.email,
      company: cr.carrier.profile?.commercialName ?? null,
      phone: cr.carrier.profile?.contacts[0]?.value ?? null,
      carrierTarget: cr.carrierTarget ?? null,
    }));

    // `targets` alimenta el resumen de comisión del vendedor, que solo necesita
    // los importes sueltos.
    const targets = carriers
      .map((c) => c.carrierTarget)
      .filter((t): t is number => t != null);

    return Response.json({ routes, carriers, targets });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
