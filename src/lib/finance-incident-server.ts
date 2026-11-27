/**
 * Finanzas también registra incidencias (decisión del cliente): Sí/No y el
 * tipo, en el mismo embarque, aunque ya esté cerrado. Lo usan el PATCH de
 * finanzas de admin y el de colaborador (con permiso de editar Finanzas).
 */
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { formatIncidentYesNo, incidentAllowsIncidentType } from "@/lib/incident-yes-no";

export function isIncidentBody(body: unknown): boolean {
  return !!body && typeof body === "object" && "incident" in body;
}

export async function setFinanceIncident(id: string, body: unknown, user: { id: string; name: string }): Promise<Response> {
  const b = body as { incident?: unknown; incidentType?: unknown };
  const incident = typeof b.incident === "string" ? b.incident.trim().toLowerCase() : "";
  if (incident !== "si" && incident !== "no" && incident !== "") return Response.json({ error: "Incidencia no válida." }, { status: 400 });
  let incidentType = typeof b.incidentType === "string" ? b.incidentType.trim() || null : null;
  if (!incidentAllowsIncidentType(incident)) incidentType = null;
  if (incidentType && !(await prisma.incidentTypeDef.findUnique({ where: { value: incidentType }, select: { id: true } }))) {
    return Response.json({ error: "Tipo de incidencia no válido." }, { status: 400 });
  }

  const shipment = await prisma.shipment.findUnique({
    where: { id },
    select: { eco: true, origin: true, destination: true, incident: true, incidentType: true },
  });
  if (!shipment) return Response.json({ error: "No encontrado" }, { status: 404 });

  const updated = await prisma.shipment.update({
    where: { id },
    data: { incident: incident || null, incidentType },
    select: { incident: true, incidentType: true },
  });
  // El registro de finanzas guarda una copia: se mantiene al día.
  await prisma.finance.updateMany({ where: { shipmentId: id }, data: { incident: updated.incident, incidentType: updated.incidentType } });

  void logAudit({
    resource: "shipment",
    resourceId: id,
    resourceLabel: `${shipment.eco ?? ""} – ${shipment.origin ?? ""} → ${shipment.destination ?? ""}`.trim(),
    action: "updated",
    userId: user.id,
    userName: user.name,
    changes: [
      { field: "incident", label: "Incidencia (Finanzas)", from: formatIncidentYesNo(shipment.incident) || null, to: formatIncidentYesNo(updated.incident) || null },
      { field: "incidentType", label: "Tipo de incidencia (Finanzas)", from: shipment.incidentType, to: updated.incidentType },
    ],
  });
  return Response.json(updated);
}
