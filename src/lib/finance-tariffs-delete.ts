import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { formatMxn } from "@/lib/utils";
import { effectiveTariffs } from "@/lib/shipment-tariffs";
import { clearShipmentTariffs, financeOf } from "@/lib/shipment-tariffs-server";

/**
 * Quita las tarifas de un embarque desde la tabla de finanzas y deja en la
 * bitácora cuánto eran, para poder reponerlas si fue un error.
 */
export async function clearTariffsResponse(shipmentId: string, user: { id: string; name: string }): Promise<Response> {
  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
  if (!shipment) return Response.json({ error: "No encontrado" }, { status: 404 });

  const before = effectiveTariffs(shipment, await financeOf(shipment));
  if (before.sale == null && before.cost == null) return Response.json({ ok: true });

  await clearShipmentTariffs(shipment);
  const money = (v: number | null) => (v == null ? null : `$${formatMxn(v)}`);
  void logAudit({
    resource: "shipment",
    resourceId: shipment.id,
    resourceLabel: `${shipment.eco ?? ""} – ${shipment.origin ?? ""} → ${shipment.destination ?? ""}`.trim(),
    action: "updated",
    userId: user.id,
    userName: user.name,
    changes: [
      { field: "sale", label: "Tarifa de venta", from: money(before.sale), to: null },
      { field: "cost", label: "Tarifa de compra", from: money(before.cost), to: null },
    ],
  });
  return Response.json({ ok: true });
}
