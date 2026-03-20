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
      include: { createdBy: { select: { id: true, name: true } } },
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
    const unitTypeValue = body.unitType ? String(body.unitType).trim() : null;
    const validUnitType = unitTypeValue
      ? await prisma.unitTypeDef.findUnique({ where: { value: unitTypeValue } })
      : null;
    const unitType = validUnitType ? unitTypeValue! : "caja_seca";
    const status: RouteStatus = VALID_STATUSES.includes(body.status) ? body.status : "pending";

    if (!origin || !destination) {
      return Response.json({ error: "El origen y destino son requeridos" }, { status: 400 });
    }

    const duplicate = await prisma.route.findFirst({
      where: {
        origin: { equals: origin, mode: "insensitive" },
        destination: { equals: destination, mode: "insensitive" },
      },
    });
    if (duplicate) {
      return Response.json(
        { error: `La ruta ${origin} → ${destination} ya está dada de alta.`, code: "ROUTE_EXISTS" },
        { status: 409 }
      );
    }

    const route = await (prisma.route.create as unknown as (a: { data: Record<string, unknown>; include: Record<string, unknown> }) => Promise<PrismaRoute>)({
      data: {
        origin,
        destination,
        destinationState: destinationState || undefined,
        description: description || undefined,
        target: target ?? undefined,
        weeklyVolume: weeklyVolume ?? undefined,
        unitType,
        status,
        createdById: session.user.id,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    void logRoute({
      routeId: route.id,
      routeLabel: `${origin} → ${destination}`,
      action: "created",
      userId: session.user.id,
      userName: (session.user as { name: string }).name,
      snapshot: { origin, destination, destinationState, description, target, weeklyVolume, unitType, status },
    });
    void logAudit({
      resource: "route", resourceId: route.id, resourceLabel: `${origin} → ${destination}`,
      action: "created", userId: session.user.id, userName: (session.user as { name: string }).name,
    });
    void alertMatchingCarriers({
      id: route.id,
      origin,
      destination,
      destinationState: destinationState ?? null,
      unitType,
    });

    return Response.json(routeToJson(route));
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
