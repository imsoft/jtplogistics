import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireCarrier } from "@/lib/auth-server";

// GET  — todas las rutas activas + selección guardada del carrier + permiso de edición
export async function GET() {
  try {
    const session = await requireCarrier();

    const [routes, carrierRoutes, userRecord] = await Promise.all([
      prisma.route.findMany({
        where: { status: "active" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.carrierRoute.findMany({
        where: { carrierId: session.user.id },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { canEditTarget: true },
      }),
    ]);

    const selectionMap = new Map<string, number | null>(
      carrierRoutes.map((cr) => [cr.routeId, cr.carrierTarget ?? null])
    );

    return Response.json({
      canEditTarget: userRecord?.canEditTarget ?? false,
      routes: routes.map((r) => ({
        id: r.id,
        origin: r.origin,
        destination: r.destination,
        description: r.description ?? null,
        jtpTarget: r.target ?? null,
        selected: selectionMap.has(r.id),
        carrierTarget: selectionMap.get(r.id) ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
    });
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

    const userRecord = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canEditTarget: true },
    });

    // Si no tiene permiso, preservar los targets existentes
    let data = body;
    if (!userRecord?.canEditTarget) {
      const existingRoutes = await prisma.carrierRoute.findMany({
        where: { carrierId: session.user.id },
      });
      const existingTargetMap = new Map(
        existingRoutes.map((r) => [r.routeId, r.carrierTarget ?? null])
      );
      data = body.map((item) => ({
        ...item,
        carrierTarget: existingTargetMap.get(item.routeId) ?? null,
      }));
    }

    // Transacción: borra las existentes y reinserta las nuevas
    await prisma.$transaction([
      prisma.carrierRoute.deleteMany({ where: { carrierId: session.user.id } }),
      prisma.carrierRoute.createMany({
        data: data.map((item) => ({
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
