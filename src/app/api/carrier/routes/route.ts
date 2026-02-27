import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireCarrier } from "@/lib/auth-server";

// GET  — todas las rutas activas + selección guardada del carrier
export async function GET() {
  try {
    const session = await requireCarrier();

    const routes = await prisma.route.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
    });

    const carrierRoutes = await prisma.carrierRoute.findMany({
      where: { carrierId: session.user.id },
    });

    const selectionMap = new Map<string, number | null>(
      carrierRoutes.map((cr) => [cr.routeId, cr.carrierTarget ?? null])
    );

    return Response.json(
      routes.map((r) => ({
        id: r.id,
        origin: r.origin,
        destination: r.destination,
        description: r.description ?? null,
        jtpTarget: r.target ?? null,
        selected: selectionMap.has(r.id),
        carrierTarget: selectionMap.get(r.id) ?? null,
        createdAt: r.createdAt.toISOString(),
      }))
    );
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT  — guarda/reemplaza selecciones del carrier
// body: [{ routeId, carrierTarget }]
export async function PUT(request: NextRequest) {
  try {
    const session = await requireCarrier();

    const body: { routeId: string; carrierTarget: number | null }[] = await request.json();

    if (!Array.isArray(body)) {
      return Response.json({ error: "Body must be an array" }, { status: 400 });
    }

    // Transacción: borra las existentes y reinserta las nuevas
    await prisma.$transaction([
      prisma.carrierRoute.deleteMany({ where: { carrierId: session.user.id } }),
      prisma.carrierRoute.createMany({
        data: body.map((item) => ({
          carrierId: session.user.id,
          routeId: item.routeId,
          carrierTarget: item.carrierTarget ?? undefined,
        })),
      }),
    ]);

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
