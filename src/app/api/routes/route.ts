import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireAdmin } from "@/lib/auth-server";
import { type PrismaRoute, VALID_STATUSES, routeToJson } from "@/lib/api/route-utils";
import { getCityState } from "@/lib/data/mexico-cities";
import { logRoute } from "@/lib/route-log";
import { logAudit } from "@/lib/audit-log";
import { alertMatchingCarriers } from "@/lib/carrier-route-alert";
import type { RouteStatus } from "@/types/route.types";

export async function GET() {
  try {
    await requireSession();
    const routes = await prisma.route.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, name: true } },
        unitTargets: true,
      },
    });
    return Response.json((routes as unknown as PrismaRoute[]).map(routeToJson));
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();

    const body = await request.json();
    const origin = String(body.origin ?? "").trim();
    const destination = String(body.destination ?? "").trim();
    const description = body.description != null ? String(body.description).trim() : null;
    const stateFromBody = body.destinationState != null ? String(body.destinationState).trim() : "";
    const destinationState = stateFromBody || (destination ? getCityState(destination) : null);
    const target = body.target != null ? Number(body.target) : null;
    const weeklyVolume = body.weeklyVolume != null ? Math.round(Number(body.weeklyVolume)) : null;
    const unitTargetsRaw: Array<{ unitType?: unknown; target?: unknown }> = Array.isArray(body.unitTargets) ? body.unitTargets : [];
    const normalizedUnitTargets = (
      unitTargetsRaw.length > 0
        ? unitTargetsRaw
        : [{ unitType: body.unitType, target: body.target }]
    )
      .map((item: { unitType?: unknown; target?: unknown }) => ({
        unitType: String(item?.unitType ?? "").trim(),
        target: item?.target != null ? Number(item.target) : null,
      }))
      .filter((item) => item.unitType);
    const validUnitTypes = await prisma.unitTypeDef.findMany({
      where: { value: { in: normalizedUnitTargets.map((ut) => ut.unitType) } },
      select: { value: true },
    });
    const validSet = new Set(validUnitTypes.map((u) => u.value));
    const unitTargets = normalizedUnitTargets
      .map((item) => ({
        unitType: validSet.has(item.unitType) ? item.unitType : "caja_seca",
        target: item.target,
      }))
      .filter((item, index, arr) => arr.findIndex((x) => x.unitType === item.unitType) === index);
    const status: RouteStatus = VALID_STATUSES.includes(body.status) ? body.status : "pending";

    if (!origin || !destination) {
      return Response.json({ error: "El origen y destino son requeridos" }, { status: 400 });
    }

    if (unitTargets.length === 0) {
      return Response.json({ error: "Selecciona al menos un tipo de unidad" }, { status: 400 });
    }

    const sameOdRoutes = await prisma.route.findMany({
      where: {
        origin: { equals: origin, mode: "insensitive" },
        destination: { equals: destination, mode: "insensitive" },
      },
      include: { unitTargets: true },
    });
    for (const er of sameOdRoutes) {
      const types =
        er.unitTargets.length > 0 ? er.unitTargets.map((u) => u.unitType) : [er.unitType];
      for (const ut of unitTargets) {
        if (types.includes(ut.unitType)) {
          return Response.json(
            {
              error: `Ya existe la ruta ${origin} → ${destination} para uno de los tipos seleccionados.`,
              code: "ROUTE_EXISTS",
            },
            { status: 409 }
          );
        }
      }
    }

    const first = unitTargets[0];
    const route = await prisma.route.create({
      data: {
        origin,
        destination,
        destinationState: destinationState || undefined,
        description: description || undefined,
        target: first.target ?? target ?? undefined,
        weeklyVolume: weeklyVolume ?? undefined,
        unitType: first.unitType,
        status,
        createdById: session.user.id,
        unitTargets: {
          create: unitTargets.map((ut) => ({
            unitType: ut.unitType,
            target: ut.target ?? undefined,
          })),
        },
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        unitTargets: true,
      },
    });

    void logRoute({
      routeId: route.id,
      routeLabel: `${origin} → ${destination}`,
      action: "created",
      userId: session.user.id,
      userName: (session.user as { name: string }).name,
      snapshot: {
        origin,
        destination,
        destinationState,
        description,
        target: route.target,
        weeklyVolume,
        unitType: route.unitType,
        status,
      },
    });
    void logAudit({
      resource: "route",
      resourceId: route.id,
      resourceLabel: `${origin} → ${destination}`,
      action: "created",
      userId: session.user.id,
      userName: (session.user as { name: string }).name,
    });
    for (const ut of unitTargets) {
      void alertMatchingCarriers({
        id: route.id,
        origin,
        destination,
        destinationState: destinationState ?? null,
        unitType: ut.unitType,
      });
    }

    return Response.json({ routes: [routeToJson(route as unknown as PrismaRoute)] });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
