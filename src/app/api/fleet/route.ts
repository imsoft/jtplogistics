import { prisma } from "@/lib/db";
import { fleetReadiness, type OperatorData, type VehicleData } from "@/lib/carrier-fleet";
import { fleetFailure, operatorToJson, requireFleetAccess, vehicleToJson } from "@/lib/carrier-fleet-server";

/** GET /api/fleet?carrierId= — unidades, operadores y si ya puede ir en una Carta Porte. */
export async function GET(request: Request) {
  try {
    const { carrierId, canEdit } = await requireFleetAccess(new URL(request.url).searchParams.get("carrierId"), "view");
    const [vehicles, operators] = await Promise.all([
      prisma.carrierVehicle.findMany({ where: { carrierId }, orderBy: [{ active: "desc" }, { kind: "asc" }, { createdAt: "asc" }] }),
      prisma.carrierOperator.findMany({ where: { carrierId }, orderBy: [{ active: "desc" }, { name: "asc" }] }),
    ]);
    return Response.json({
      canEdit,
      vehicles: vehicles.map((v) => vehicleToJson(v as VehicleData & typeof v)),
      operators: operators.map(operatorToJson),
      readiness: fleetReadiness(vehicles as unknown as VehicleData[], operators as OperatorData[]),
    });
  } catch (e) {
    return fleetFailure(e, "GET");
  }
}
