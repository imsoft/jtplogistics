import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";

// GET — rutas asignadas al cliente
// ?idsOnly=true  →  string[]  (retrocompatibilidad con el dialog)
// ?idsOnly=false →  { id, origin, destination, destinationState, unitType, status }[]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async () => {
    const { id } = await params;
    const idsOnly = req.nextUrl.searchParams.get("idsOnly") !== "false";

    if (idsOnly) {
      const clientRoutes = await prisma.clientRoute.findMany({
        where: { clientId: id },
        select: { routeId: true },
      });
      return Response.json(clientRoutes.map((cr) => cr.routeId));
    }

    const clientRoutes = await prisma.clientRoute.findMany({
      where: { clientId: id },
      include: {
        route: {
          select: {
            id: true,
            origin: true,
            destination: true,
            destinationState: true,
            unitType: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return Response.json(clientRoutes.map((cr) => cr.route));
  });
}

// PUT — reemplaza las rutas asignadas al cliente
// body: string[]  (array de routeIds)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async () => {
    const { id } = await params;
    const body: string[] = await request.json();

    if (!Array.isArray(body)) {
      return Response.json({ error: "El cuerpo debe ser un arreglo de IDs" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) {
      return Response.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.clientRoute.deleteMany({ where: { clientId: id } }),
      prisma.clientRoute.createMany({
        data: body.map((routeId) => ({ clientId: id, routeId })),
      }),
    ]);

    return Response.json({ ok: true });
  });
}
