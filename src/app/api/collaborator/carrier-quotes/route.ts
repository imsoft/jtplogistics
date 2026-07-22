import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";

type CarrierRouteWithCarrier = {
  id: string;
  carrierId: string;
  carrierTarget: number | null;
  carrier: {
    name: string;
    email: string;
    profile: {
      commercialName: string | null;
      contacts: { type: string; value: string }[];
    } | null;
  };
};

export async function GET(request: NextRequest) {
  try {
    const session = await requireCollaboratorOrAdmin();

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canViewQuotes: true },
    });

    if (!me?.canViewQuotes) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const routeId = searchParams.get("routeId");

    // Se listan TODAS las rutas (activas, pendientes e inactivas): el cotizador
    // debe poder cotizar cualquier ruta registrada, no solo las activas.
    const routes = await prisma.route.findMany({
      select: { id: true, origin: true, destination: true, destinationState: true, unitType: true, target: true, status: true },
      orderBy: [{ origin: "asc" }, { destination: "asc" }],
    });

    if (!routeId) {
      return Response.json({ routes, carriers: [] });
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

    const carriers = (carrierRoutes as CarrierRouteWithCarrier[]).map((cr) => ({
      id: cr.id,
      carrierId: cr.carrierId,
      name: cr.carrier.name,
      email: cr.carrier.email,
      company: cr.carrier.profile?.commercialName ?? null,
      phone: cr.carrier.profile?.contacts[0]?.value ?? null,
      carrierTarget: cr.carrierTarget ?? null,
    }));

    return Response.json({ routes, carriers });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
