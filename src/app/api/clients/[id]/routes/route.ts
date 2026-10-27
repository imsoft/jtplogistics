import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hasModuleAccess, requireModuleAccess } from "@/lib/module-access";
import { logAudit } from "@/lib/audit-log";
import { routeCreatorName } from "@/lib/api/route-utils";

/**
 * Rutas asignadas a un cliente. Una sola API para los dos paneles: quien
 * tiene permiso de Clientes puede asignar rutas a un cliente aunque no tenga
 * acceso al módulo de Rutas (Finanzas da de alta clientes sin ver rutas).
 */
const MODULE = "Clients";

function fail(e: unknown, where: string) {
  if (e instanceof Response) return e;
  console.error(`[clients/:id/routes] ${where}`, e);
  return Response.json({ error: "Error interno del servidor" }, { status: 500 });
}

// GET
// ?catalog=true  →  todas las rutas del sistema, una fila por tipo de unidad,
//                   sin tarifas (para el diálogo de selección)
// ?idsOnly=true  →  { routeId, unitType }[]  (lo que ya tiene asignado el cliente)
// ?idsOnly=false →  AssignedRoute[]           (para las vistas de detalle/edición)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess(MODULE, "view");
    const { id } = await params;
    const sp = req.nextUrl.searchParams;

    if (sp.get("catalog") === "true") {
      const routes = await prisma.route.findMany({
        orderBy: [{ origin: "asc" }, { destination: "asc" }],
        select: {
          id: true,
          origin: true,
          destination: true,
          destinationState: true,
          unitType: true,
          status: true,
          createdBy: { select: { name: true } },
          bulkImported: true,
          unitTargets: { select: { unitType: true } },
        },
      });
      const rows = routes.flatMap((r) => {
        const types = r.unitTargets.length > 0 ? r.unitTargets.map((u) => u.unitType) : [r.unitType];
        return types.map((unitType) => ({
          key: `${r.id}:${unitType}`,
          routeId: r.id,
          unitType,
          origin: r.origin,
          destination: r.destination,
          destinationState: r.destinationState,
          status: r.status,
          createdByName: routeCreatorName(r),
        }));
      });
      return Response.json(rows);
    }

    const idsOnly = sp.get("idsOnly") !== "false";
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
            bulkImported: true,
            unitTargets: { select: { unitType: true, target: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const canSeeTargets = await hasModuleAccess(session.user, "Routes", "view");
    return Response.json(
      clientRoutes.map((cr) => ({
        id: cr.route.id,
        clientRouteId: cr.id,
        origin: cr.route.origin,
        destination: cr.route.destination,
        destinationState: cr.route.destinationState,
        unitType: cr.unitType || cr.route.unitTargets[0]?.unitType || cr.route.unitType,
        // El target de JTP es de Rutas: con solo Clientes se ve el tipo de unidad, no el precio.
        unitTargets: canSeeTargets ? cr.route.unitTargets : cr.route.unitTargets.map((u) => ({ unitType: u.unitType, target: null })),
        status: cr.route.status,
        target: cr.target ?? null,
        weeklyVolume: cr.weeklyVolume ?? null,
        clientTarget: cr.target ?? null,
        clientWeeklyVolume: cr.weeklyVolume ?? null,
        createdByName: routeCreatorName(cr.route),
      }))
    );
  } catch (e) {
    return fail(e, "GET");
  }
}

// PATCH — actualiza tarifa/volumen de una asignación (por clientRouteId)
// body: { clientRouteId, target, weeklyVolume }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess(MODULE, "update");
    const { id } = await params;
    const { clientRouteId, routeId, target, weeklyVolume } = await request.json();

    const clientRoute = clientRouteId
      ? await prisma.clientRoute.findFirst({ where: { id: clientRouteId, clientId: id } })
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
  } catch (e) {
    return fail(e, "PATCH");
  }
}

// PUT — reemplaza las rutas asignadas al cliente
// body: { routeId: string; unitType: string }[]
// Preserva target/weeklyVolume de asignaciones existentes que no se eliminan
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess(MODULE, "update");
    const { id } = await params;
    const body: { routeId: string; unitType: string }[] = await request.json();

    if (!Array.isArray(body)) {
      return Response.json({ error: "El cuerpo debe ser un arreglo de {routeId, unitType}" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) {
      return Response.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const existing = await prisma.clientRoute.findMany({
      where: { clientId: id },
      select: { id: true, routeId: true, unitType: true },
    });
    const existingKeys = new Set(existing.map((cr) => `${cr.routeId}:${cr.unitType}`));
    const incomingKeys = new Set(body.map((b) => `${b.routeId}:${b.unitType}`));

    const toDeleteIds = existing
      .filter((cr) => !incomingKeys.has(`${cr.routeId}:${cr.unitType}`))
      .map((cr) => cr.id);
    const toCreate = body.filter((b) => !existingKeys.has(`${b.routeId}:${b.unitType}`));

    if (toDeleteIds.length > 0) {
      await prisma.clientRoute.deleteMany({ where: { id: { in: toDeleteIds } } });
    }
    if (toCreate.length > 0) {
      await prisma.clientRoute.createMany({
        data: toCreate.map((b) => ({ clientId: id, routeId: b.routeId, unitType: b.unitType })),
        skipDuplicates: true,
      });
    }

    void logAudit({
      resource: "client_routes",
      resourceId: id,
      resourceLabel: `${client.name} rutas`,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
      changes: [
        { field: "routes", label: "Rutas asignadas", from: String(existing.length), to: String(body.length) },
      ],
    });

    return Response.json({ ok: true, added: toCreate.length, removed: toDeleteIds.length });
  } catch (e) {
    return fail(e, "PUT");
  }
}
