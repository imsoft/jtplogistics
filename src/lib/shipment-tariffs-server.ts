import type { Finance, Shipment } from "@prisma/client";
import { prisma } from "@/lib/db";
import { financeMatchesShipment } from "@/lib/finance-shipment-match";

/** Los datos del embarque que se copian a su registro de finanzas. */
function financeData(s: Shipment) {
  return {
    eco: s.eco,
    client: s.client,
    origin: s.origin,
    destination: s.destination,
    sale: s.sale,
    product: s.product,
    pickupDate: s.pickupDate,
    deliveryDate: s.deliveryDate,
    legalName: s.legalName,
    cost: s.cost,
    operatorName: s.operatorName,
    truck: s.truck,
    trailer: s.trailer,
    unit: s.unit,
    phone: s.phone,
    comments: s.comments,
    incident: s.incident,
    incidentType: s.incidentType,
  };
}

/** El registro de finanzas del embarque: el ligado, o uno viejo sin liga que coincida. */
async function financeOf(shipment: Shipment): Promise<Finance | null> {
  const linked = await prisma.finance.findUnique({ where: { shipmentId: shipment.id } });
  if (linked) return linked;
  if (!shipment.eco || !shipment.client || !shipment.origin || !shipment.destination) return null;
  const candidates = await prisma.finance.findMany({
    where: { shipmentId: null, eco: shipment.eco, client: shipment.client, origin: shipment.origin, destination: shipment.destination },
    orderBy: { createdAt: "desc" },
  });
  return candidates.find((f) => financeMatchesShipment(f, shipment)) ?? null;
}

/**
 * Mantiene el registro de finanzas de un embarque: uno solo por embarque.
 * - Cerrado: se crea si no existe; si existe, se actualiza con lo del embarque
 *   (aunque se haya editado después de cerrarlo o reabierto y vuelto a cerrar).
 * - No cerrado: si ya tenía registro (se reabrió), solo se le llevan las tarifas.
 * Devuelve el registro si se acaba de crear, para dejarlo en la bitácora.
 */
export async function syncShipmentFinance(shipment: Shipment, closedStatus: string): Promise<Finance | null> {
  const existing = await financeOf(shipment);
  if (shipment.status === closedStatus) {
    const data = { ...financeData(shipment), shipmentId: shipment.id };
    if (existing) {
      await prisma.finance.update({ where: { id: existing.id }, data });
      return null;
    }
    return prisma.finance.create({ data });
  }
  if (existing) {
    await prisma.finance.update({
      where: { id: existing.id },
      data: {
        shipmentId: shipment.id,
        ...(shipment.sale != null && { sale: shipment.sale }),
        ...(shipment.cost != null && { cost: shipment.cost }),
      },
    });
  }
  return null;
}

/**
 * Los registros de finanzas que pueden corresponder a estos embarques (los
 * ligados y los viejos sin liga del mismo ECO), en lugar de traer toda la
 * tabla en cada página.
 */
export function financesForShipments(shipments: Shipment[]): Promise<Finance[]> {
  if (shipments.length === 0) return Promise.resolve([]);
  const ecos = [...new Set(shipments.map((s) => s.eco).filter((e): e is string => Boolean(e)))];
  return prisma.finance.findMany({
    where: { OR: [{ shipmentId: { in: shipments.map((s) => s.id) } }, ...(ecos.length ? [{ shipmentId: null, eco: { in: ecos } }] : [])] },
    orderBy: { createdAt: "desc" },
  });
}
