import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { readOperatorBody } from "@/lib/carrier-fleet";
import { fleetFailure, requireFleetAccess } from "@/lib/carrier-fleet-server";

/** POST /api/fleet/operators — el transportista no manda carrierId; JTP sí. */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const access = await requireFleetAccess(typeof body.carrierId === "string" ? body.carrierId : null, "edit");
    const parsed = readOperatorBody(body);
    if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
    const created = await prisma.carrierOperator.create({ data: { ...parsed.data, carrierId: access.carrierId }, select: { id: true } });
    void logAudit({ resource: "fleet_operator", resourceId: created.id, resourceLabel: `Operador ${parsed.data.name}`, action: "created", userId: access.userId, userName: access.userName });
    return Response.json({ id: created.id }, { status: 201 });
  } catch (e) {
    return fleetFailure(e, "operators POST");
  }
}
