/**
 * Quién puede ver y editar el expediente de Carta Porte de un transportista:
 *  - el propio transportista (su usuario principal, o un usuario suyo con
 *    permiso de editar los datos de la empresa);
 *  - dirección y soporte de TI;
 *  - colaboradores con permiso de Proveedores (ver / editar).
 */

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import { requireCarrierAccount } from "@/lib/carrier-account";
import { hasModuleAccess } from "@/lib/module-access";
import type { OperatorData, VehicleData } from "@/lib/carrier-fleet";

function deny(message = "Sin permiso", status = 403): Response {
  return new Response(JSON.stringify({ error: message }), { status, headers: { "Content-Type": "application/json" } });
}

export async function requireFleetAccess(requestedCarrierId: string | null, action: "view" | "edit") {
  const session = await requireSession();
  const role = session.user.role;

  if (role === "carrier") {
    const acc = await requireCarrierAccount(action === "edit" ? "editCompany" : undefined);
    return { carrierId: acc.carrierId, userId: acc.userId, userName: session.user.name, canEdit: acc.can.editCompany };
  }

  const isBoss = role === "admin" || role === "developer";
  const canEdit = isBoss || (role === "collaborator" && (await hasModuleAccess(session.user, "Providers", "update")));
  const allowed = action === "edit" ? canEdit : canEdit || (role === "collaborator" && (await hasModuleAccess(session.user, "Providers", "view")));
  if (!allowed) throw deny();
  if (!requestedCarrierId) throw deny("Falta el transportista.", 400);

  const carrier = await prisma.user.findFirst({
    where: { id: requestedCarrierId, role: "carrier", parentCarrierId: null },
    select: { id: true },
  });
  if (!carrier) throw deny("Transportista no encontrado.", 404);
  return { carrierId: carrier.id, userId: session.user.id, userName: session.user.name, canEdit };
}

export function vehicleToJson(v: VehicleData & { id: string; createdAt: Date; updatedAt: Date }) {
  return {
    id: v.id,
    kind: v.kind,
    label: v.label,
    plates: v.plates,
    year: v.year,
    vehicleConfig: v.vehicleConfig,
    sctPermitType: v.sctPermitType,
    sctPermitNumber: v.sctPermitNumber,
    grossWeightTons: v.grossWeightTons,
    insurer: v.insurer,
    policyNumber: v.policyNumber,
    trailerSubtype: v.trailerSubtype,
    active: v.active,
    updatedAt: v.updatedAt.toISOString(),
  };
}

export function operatorToJson(o: OperatorData & { id: string; updatedAt: Date }) {
  return {
    id: o.id,
    name: o.name,
    rfc: o.rfc,
    licenseNumber: o.licenseNumber,
    phone: o.phone,
    active: o.active,
    updatedAt: o.updatedAt.toISOString(),
  };
}

export function fleetFailure(e: unknown, where: string) {
  if (e instanceof Response) return e;
  console.error(`[fleet] ${where}`, e);
  return Response.json({ error: "Error interno del servidor" }, { status: 500 });
}
