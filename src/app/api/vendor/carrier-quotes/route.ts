import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireVendedor } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  try {
    await requireVendedor();

    const { searchParams } = new URL(request.url);
    const routeId = searchParams.get("routeId");

    const routes = await prisma.route.findMany({
      where: { status: "active" },
      select: { id: true, origin: true, destination: true, target: true },
      orderBy: [{ origin: "asc" }, { destination: "asc" }],
    });

    if (!routeId) {
      return Response.json({ routes, carriers: [] });
    }

    const carrierRoutes = await prisma.carrierRoute.findMany({
      where: { routeId },
      select: { carrierTarget: true },
    });

    // Only return aggregate stats, no carrier details
    const targets = carrierRoutes
      .map((cr) => cr.carrierTarget)
      .filter((t): t is number => t != null);

    return Response.json({ routes, targets });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
