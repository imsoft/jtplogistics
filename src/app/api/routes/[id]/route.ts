import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireAdmin } from "@/lib/auth-server";
import { type PrismaRoute, VALID_STATUSES, routeToJson } from "@/lib/api/route-utils";
import { getCityState } from "@/lib/data/mexico-cities";
import { logRoute, diffSnapshots, type RouteSnapshot } from "@/lib/route-log";
import type { RouteStatus } from "@/types/route.types";

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
    if (!route) return Response.json({ error: "No encontrado" }, { status: 404 });
    return Response.json(routeToJson(route as unknown as PrismaRoute));
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();

    const { id } = await params;
    const body = await request.json();
    const origin = body.origin != null ? String(body.origin).trim() : undefined;
    const destination = body.destination != null ? String(body.destination).trim() : undefined;
    const destinationState = body.destinationState != null ? String(body.destinationState).trim() : undefined;
    const description = body.description != null ? String(body.description).trim() : undefined;
    const target = body.target != null ? Number(body.target) : undefined;
    const weeklyVolume = body.weeklyVolume != null ? Math.round(Number(body.weeklyVolume)) : undefined;
    const unitTypeRaw = body.unitType ? String(body.unitType).trim() : undefined;
    const unitType: string | undefined = unitTypeRaw
      ? ((await prisma.unitTypeDef.findUnique({ where: { value: unitTypeRaw } })) ? unitTypeRaw : undefined)
      : undefined;
    const status: RouteStatus | undefined = VALID_STATUSES.includes(body.status) ? body.status : undefined;

    const updateData: Record<string, unknown> = {};
    if (origin !== undefined) updateData.origin = origin;
    if (destination !== undefined) {
      updateData.destination = destination;
      const state = destinationState !== undefined ? String(destinationState).trim() : getCityState(destination);
      updateData.destinationState = state || null;
    }
    if (destinationState !== undefined && destination === undefined) updateData.destinationState = destinationState || null;
    if (description !== undefined) updateData.description = description;
    if (target !== undefined) updateData.target = target;
    if (weeklyVolume !== undefined) updateData.weeklyVolume = weeklyVolume;
    if (unitType !== undefined) updateData.unitType = unitType;
    if (status !== undefined) updateData.status = status;

    // Snapshot antes del cambio para el diff
    const before = await prisma.route.findUnique({ where: { id } });

    const route = await (prisma.route.update as unknown as (a: { where: { id: string }; data: Record<string, unknown>; include: Record<string, unknown> }) => Promise<PrismaRoute>)({
      where: { id },
      data: updateData,
      include: { createdBy: { select: { id: true, name: true } } },
    });

    if (before) {
      const beforeSnap: RouteSnapshot = {
        origin: before.origin, destination: before.destination,
        destinationState: before.destinationState, description: before.description,
        target: before.target, weeklyVolume: before.weeklyVolume,
        unitType: before.unitType, status: before.status,
      };
      const afterSnap: RouteSnapshot = {
        origin: route.origin, destination: route.destination,
        destinationState: route.destinationState, description: route.description,
        target: route.target, weeklyVolume: route.weeklyVolume,
        unitType: route.unitType, status: route.status,
      };
      const changes = diffSnapshots(beforeSnap, afterSnap);
      if (changes.length > 0) {
        void logRoute({
          routeId: id,
          routeLabel: `${route.origin} → ${route.destination}`,
          action: "updated",
          userId: session.user.id,
          userName: (session.user as { name: string }).name,
          changes,
          snapshot: afterSnap,
        });
      }
    }

    return Response.json(routeToJson(route));
  } catch (e) {
    if (e instanceof Response) throw e;
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const route = await prisma.route.findUnique({ where: { id } });
    await prisma.route.delete({ where: { id } });

    if (route) {
      void logRoute({
        routeId: id,
        routeLabel: `${route.origin} → ${route.destination}`,
        action: "deleted",
        userId: session.user.id,
        userName: (session.user as { name: string }).name,
        snapshot: {
          origin: route.origin, destination: route.destination,
          destinationState: route.destinationState, description: route.description,
          target: route.target, weeklyVolume: route.weeklyVolume,
          unitType: route.unitType, status: route.status,
        },
      });
    }

    return new Response(null, { status: 204 });
  } catch (e) {
    if (e instanceof Response) throw e;
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
