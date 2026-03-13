import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireAdmin } from "@/lib/auth-server";
import { type PrismaRoute, VALID_UNIT_TYPES, VALID_STATUSES, routeToJson } from "@/lib/api/route-utils";
import { getCityState } from "@/lib/data/mexico-cities";
import type { UnitType, RouteStatus } from "@/types/route.types";

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
    const unitType: UnitType = VALID_UNIT_TYPES.includes(body.unitType) ? body.unitType : "dry_box";
    const status: RouteStatus = VALID_STATUSES.includes(body.status) ? body.status : "pending";

    if (!origin || !destination) {
      return Response.json({ error: "El origen y destino son requeridos" }, { status: 400 });
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
    return Response.json(routeToJson(route));
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
