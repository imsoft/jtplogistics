import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { logAudit } from "@/lib/audit-log";

// GET — rutas asignadas al cliente
// ?idsOnly=true  →  { routeId, unitType }[]  (para el dialog de selección)
// ?idsOnly=false →  AssignedRoute[]           (para las vistas de detalle/edición)
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
        select: { routeId: true, unitType: true },
      });
      return Response.json(clientRoutes.map((cr) => ({ routeId: cr.routeId, unitType: cr.unitType })));
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
            createdBy: { select: { name: true } },
            unitTargets: { select: { unitType: true, target: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return Response.json(
      clientRoutes.map((cr) => ({
        id: cr.route.id,
        clientRouteId: cr.id,
        origin: cr.route.origin,
        destination: cr.route.destination,
        destinationState: cr.route.destinationState,
        unitType: cr.unitType || cr.route.unitTargets[0]?.unitType || cr.route.unitType,
        unitTargets: cr.route.unitTargets,
        status: cr.route.status,
        target: cr.target ?? null,
        weeklyVolume: cr.weeklyVolume ?? null,
        clientTarget: cr.target ?? null,
        clientWeeklyVolume: cr.weeklyVolume ?? null,
        createdByName: cr.route.createdBy?.name ?? null,
      }))
    );
  });
}

// PATCH — actualiza tarifa/volumen de una asignación (por clientRouteId)
// body: { clientRouteId, target, weeklyVolume }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async (session) => {
    const { id } = await params;
    const { clientRouteId, routeId, target, weeklyVolume } = await request.json();

    const clientRoute = clientRouteId
      ? await prisma.clientRoute.findUnique({ where: { id: clientRouteId } })
      : routeId
        ? await prisma.clientRoute.findFirst({ where: { clientId: id, routeId } })
        : null;

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
// body: { routeId: string; unitType: string }[]
// Preserva target/weeklyVolume de asignaciones existentes que no se eliminan
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminHandler(async (session) => {
    const { id } = await params;
    const body: { routeId: string; unitType: string }[] = await request.json();

    if (!Array.isArray(body)) {
      return Response.json({ error: "El cuerpo debe ser un arreglo de {routeId, unitType}" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) {
      return Response.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    // Obtener asignaciones actuales para preservar target/weeklyVolume
    const existing = await prisma.clientRoute.findMany({
      where: { clientId: id },
      select: { routeId: true, unitType: true, target: true, weeklyVolume: true },
    });
    const existingMap = new Map(
      existing.map((cr) => [`${cr.routeId}:${cr.unitType}`, { target: cr.target, weeklyVolume: cr.weeklyVolume }])
    );

    const incomingKeys = new Set(body.map((b) => `${b.routeId}:${b.unitType}`));
    const toDelete = existing
      .filter((cr) => !incomingKeys.has(`${cr.routeId}:${cr.unitType}`))
      .map((cr) => ({ routeId: cr.routeId, unitType: cr.unitType }));

    await prisma.$transaction([
      // Eliminar solo las que ya no están seleccionadas
      ...toDelete.map(({ routeId, unitType }) =>
        prisma.clientRoute.deleteMany({ where: { clientId: id, routeId, unitType } })
      ),
      // Crear las nuevas preservando targets existentes
      prisma.clientRoute.createMany({
        data: body
          .filter((b) => !existingMap.has(`${b.routeId}:${b.unitType}`))
          .map((b) => ({
            clientId: id,
            routeId: b.routeId,
            unitType: b.unitType,
          })),
        skipDuplicates: true,
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
