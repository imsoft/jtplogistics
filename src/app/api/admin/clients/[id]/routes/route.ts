import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { logAudit } from "@/lib/audit-log";

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
            target: true,
            weeklyVolume: true,
            status: true,
            createdBy: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return Response.json(
      clientRoutes.map((cr) => ({
        ...cr.route,
        // Client-specific overrides take precedence
        target: cr.target ?? cr.route.target,
        weeklyVolume: cr.weeklyVolume ?? cr.route.weeklyVolume,
        clientTarget: cr.target,
        clientWeeklyVolume: cr.weeklyVolume,
        createdByName: cr.route.createdBy?.name ?? null,
        createdBy: undefined,
      }))
    );
  });
}

// PATCH — actualiza tarifa/volumen de una ruta del cliente
// body: { routeId, target, weeklyVolume }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async (session) => {
    const { id } = await params;
    const { routeId, target, weeklyVolume } = await request.json();

    if (!routeId) {
      return Response.json({ error: "routeId es requerido" }, { status: 400 });
    }

    const clientRoute = await prisma.clientRoute.findUnique({
      where: { clientId_routeId: { clientId: id, routeId } },
    });

    if (!clientRoute) {
      return Response.json({ error: "Ruta no asignada a este cliente" }, { status: 404 });
    }

    await prisma.clientRoute.update({
      where: { id: clientRoute.id },
      data: {
        target: target != null ? Number(target) : null,
        weeklyVolume: weeklyVolume != null ? Number(weeklyVolume) : null,
      },
    });

    const client = await prisma.client.findUnique({ where: { id }, select: { name: true } });

    void logAudit({
      resource: "client_routes",
      resourceId: id,
      resourceLabel: `${client?.name ?? id} — tarifa/volumen`,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ ok: true });
  });
}

// PUT — reemplaza las rutas asignadas al cliente
// body: string[]  (array de routeIds)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async (session) => {
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

    void logAudit({
      resource: "client_routes",
      resourceId: id,
      resourceLabel: `${client.name} rutas`,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
    });

    return Response.json({ ok: true });
  });
}
