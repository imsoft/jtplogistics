import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireAdmin } from "@/lib/auth-server";
import { type PrismaRoute, VALID_UNIT_TYPES, VALID_STATUSES, routeToJson } from "@/lib/api/route-utils";
import type { UnitType, RouteStatus } from "@/types/route.types";

export async function GET() {
  try {
    await requireSession();
    const routes = await prisma.route.findMany({ orderBy: { createdAt: "desc" } });
    return Response.json((routes as unknown as PrismaRoute[]).map(routeToJson));
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const origin = String(body.origin ?? "").trim();
    const destination = String(body.destination ?? "").trim();
    const destinationState = body.destinationState != null ? String(body.destinationState).trim() : null;
    const description = body.description != null ? String(body.description).trim() : null;
    const target = body.target != null ? Number(body.target) : null;
    const weeklyVolume = body.weeklyVolume != null ? Math.round(Number(body.weeklyVolume)) : null;
    const unitType: UnitType = VALID_UNIT_TYPES.includes(body.unitType) ? body.unitType : "dry_box";
    const status: RouteStatus = VALID_STATUSES.includes(body.status) ? body.status : "pending";

    if (!origin || !destination) {
      return Response.json({ error: "origin and destination are required" }, { status: 400 });
    }

    const route = await (prisma.route.create as unknown as (a: { data: Record<string, unknown> }) => Promise<PrismaRoute>)({
      data: {
        origin,
        destination,
        destinationState: destinationState || undefined,
        description: description || undefined,
        target: target ?? undefined,
        weeklyVolume: weeklyVolume ?? undefined,
        unitType,
        status,
      },
    });
    return Response.json(routeToJson(route));
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
