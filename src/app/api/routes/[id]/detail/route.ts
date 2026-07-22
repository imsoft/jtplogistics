import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireCollaboratorOrAdmin();
    const { id } = await params;

    // Validar permiso específico
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canViewRoutes: true, role: true },
    });

    if (user?.role !== "admin" && !user?.canViewRoutes) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const route = await prisma.route.findUnique({
      where: { id },
      include: {
        unitTargets: true,
        createdBy: { select: { id: true, name: true } },
        carrierRoutes: {
          include: {
            carrier: { select: { id: true, name: true, email: true, image: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        clientRoutes: {
          include: {
            client: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!route) {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }

    const unitTargets =
      route.unitTargets.length > 0
        ? route.unitTargets.map((u) => ({
            unitType: u.unitType,
            target: u.target,
          }))
        : [{ unitType: route.unitType, target: route.target }];

    return Response.json({
      id: route.id,
      origin: route.origin,
      destination: route.destination,
      destinationState: route.destinationState,
      description: route.description,
      target: route.target,
      weeklyVolume: route.weeklyVolume,
      unitType: route.unitType,
      unitTargets,
      status: route.status,
      createdByName: route.createdBy?.name ?? null,
      createdAt: route.createdAt.toISOString(),
      updatedAt: route.updatedAt.toISOString(),
      carriers: route.carrierRoutes.map((cr) => ({
        id: cr.id,
        carrierId: cr.carrier.id,
        name: cr.carrier.name,
        email: cr.carrier.email,
        image: cr.carrier.image,
        unitType: cr.unitType,
        carrierTarget: cr.carrierTarget,
        carrierWeeklyVolume: cr.carrierWeeklyVolume,
        createdAt: cr.createdAt.toISOString(),
      })),
      // Los clientes de una ruta (con su tarifa de venta) son información
      // comercial reservada al admin: no se envía a los colaboradores.
      clients:
        user.role === "admin"
          ? route.clientRoutes.map((clr) => ({
              id: clr.id,
              clientId: clr.client.id,
              name: clr.client.name,
              email: clr.client.email,
              target: clr.target,
              weeklyVolume: clr.weeklyVolume,
              createdAt: clr.createdAt.toISOString(),
            }))
          : [],
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
