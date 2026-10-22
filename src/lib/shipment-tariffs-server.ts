import type { Shipment } from "@prisma/client";
import { prisma } from "@/lib/db";
import { financeMatchesShipment } from "@/lib/finance-shipment-match";

/**
 * Lleva las tarifas del embarque a su registro de finanzas (si ya existe), con
 * la misma regla de coincidencia que usa la tabla de finanzas. Solo escribe
 * las tarifas que el embarque tiene capturadas.
 */
export async function syncFinanceTariffs(shipment: Shipment): Promise<void> {
  if (shipment.sale == null && shipment.cost == null) return;
  if (!shipment.eco || !shipment.client || !shipment.origin || !shipment.destination) return;
  const candidates = await prisma.finance.findMany({
    where: { eco: shipment.eco, client: shipment.client, origin: shipment.origin, destination: shipment.destination },
  });
  const ids = candidates.filter((f) => financeMatchesShipment(f, shipment)).map((f) => f.id);
  if (ids.length === 0) return;
  await prisma.finance.updateMany({
    where: { id: { in: ids } },
    data: {
      ...(shipment.sale != null && { sale: shipment.sale }),
      ...(shipment.cost != null && { cost: shipment.cost }),
    },
  });
}
