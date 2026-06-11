import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireCarrier } from "@/lib/auth-server";
import { computeTargetStatus } from "@/lib/target-status";

// Devuelve solo el semáforo (verde/amarillo/rojo) contra el target de JTP.
// Nunca expone el target de JTP ni el porcentaje de diferencia.
export async function GET(request: NextRequest) {
  try {
    await requireCarrier();

    const { searchParams } = request.nextUrl;
    const routeId = searchParams.get("routeId");
    const unitType = searchParams.get("unitType");
    const rawTarget = searchParams.get("carrierTarget");

    if (!routeId || !unitType || rawTarget == null) {
      return Response.json({ status: null });
    }

    const carrierTarget = parseFloat(rawTarget);
    if (isNaN(carrierTarget) || carrierTarget <= 0) {
      return Response.json({ status: null });
    }

    const route = await prisma.route.findUnique({
      where: { id: routeId },
      select: { target: true, unitTargets: { select: { unitType: true, target: true } } },
    });

    if (!route) return Response.json({ status: null });

    let adminTarget: number | null = null;
    if (route.unitTargets.length > 0) {
      const ut = route.unitTargets.find((u) => u.unitType === unitType);
      adminTarget = ut?.target ?? null;
    } else {
      adminTarget = route.target ?? null;
    }

    return Response.json({ status: computeTargetStatus(adminTarget, carrierTarget) });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ status: null });
  }
}
