import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireAdmin } from "@/lib/auth-server";
import { type PrismaRoute, VALID_UNIT_TYPES, VALID_STATUSES, routeToJson } from "@/lib/api/route-utils";
import type { UnitType, RouteStatus } from "@/types/route.types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;
    const route = await prisma.route.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    if (!route) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(routeToJson(route as unknown as PrismaRoute));
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const body = await request.json();
    const origin = body.origin != null ? String(body.origin).trim() : undefined;
    const destination = body.destination != null ? String(body.destination).trim() : undefined;
    const destinationState = body.destinationState != null ? String(body.destinationState).trim() : undefined;
    const description = body.description != null ? String(body.description).trim() : undefined;
    const target = body.target != null ? Number(body.target) : undefined;
    const weeklyVolume = body.weeklyVolume != null ? Math.round(Number(body.weeklyVolume)) : undefined;
    const unitType: UnitType | undefined = VALID_UNIT_TYPES.includes(body.unitType) ? body.unitType : undefined;
    const status: RouteStatus | undefined = VALID_STATUSES.includes(body.status) ? body.status : undefined;

    const updateData: Record<string, unknown> = {};
    if (origin !== undefined) updateData.origin = origin;
    if (destination !== undefined) updateData.destination = destination;
    if (destinationState !== undefined) updateData.destinationState = destinationState || null;
    if (description !== undefined) updateData.description = description;
    if (target !== undefined) updateData.target = target;
    if (weeklyVolume !== undefined) updateData.weeklyVolume = weeklyVolume;
    if (unitType !== undefined) updateData.unitType = unitType;
    if (status !== undefined) updateData.status = status;

    const route = await (prisma.route.update as unknown as (a: { where: { id: string }; data: Record<string, unknown>; include: Record<string, unknown> }) => Promise<PrismaRoute>)({
      where: { id },
      data: updateData,
      include: { createdBy: { select: { id: true, name: true } } },
    });
    return Response.json(routeToJson(route));
  } catch (e) {
    if (e instanceof Response) throw e;
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    console.error(e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.route.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (e) {
    if (e instanceof Response) throw e;
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    console.error(e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
