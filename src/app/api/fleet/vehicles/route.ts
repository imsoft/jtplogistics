import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { readVehicleBody } from "@/lib/carrier-fleet";
import { fleetFailure, requireFleetAccess } from "@/lib/carrier-fleet-server";

/** POST /api/fleet/vehicles — el transportista no manda carrierId; JTP sí. */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const access = await requireFleetAccess(typeof body.carrierId === "string" ? body.carrierId : null, "edit");
    const parsed = readVehicleBody(body, new Date().getFullYear());
    if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
    const created = await prisma.carrierVehicle.create({ data: { ...parsed.data, carrierId: access.carrierId }, select: { id: true } });
    void logAudit({ resource: "fleet_vehicle", resourceId: created.id, resourceLabel: `${parsed.data.kind === "motriz" ? "Unidad" : "Remolque"} ${parsed.data.plates}`, action: "created", userId: access.userId, userName: access.userName });
    return Response.json({ id: created.id }, { status: 201 });
  } catch (e) {
    return fleetFailure(e, "vehicles POST");
  }
}
