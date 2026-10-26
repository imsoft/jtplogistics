import type { Finance, Shipment } from "@prisma/client";

/**
 * Misma lógica de coincidencia que al crear finanzas desde un embarque cerrado:
 * eco, cliente, origen, destino; y fechas solo si el embarque las tiene.
 */
export function financeMatchesShipment(f: Finance, s: Shipment): boolean {
  // Ligado: es de su embarque y de ningún otro, aunque coincidan los datos.
  if (f.shipmentId) return f.shipmentId === s.id;
  if (f.eco !== s.eco || f.client !== s.client || f.origin !== s.origin || f.destination !== s.destination) {
    return false;
  }
  if (s.pickupDate) {
    if (!f.pickupDate || f.pickupDate.getTime() !== s.pickupDate.getTime()) {
      return false;
    }
  }
  if (s.deliveryDate) {
    if (!f.deliveryDate || f.deliveryDate.getTime() !== s.deliveryDate.getTime()) {
      return false;
    }
  }
  return true;
}

/** `finances` debe estar ordenado por `createdAt` descendente para preferir el registro más reciente. */
export function findFinanceForShipment(
  shipment: Shipment,
  finances: Finance[]
): Finance | null {
  // Primero el ligado al embarque; si no hay, el más reciente que coincida.
  return (shipment.id ? finances.find((f) => f.shipmentId === shipment.id) : undefined) ?? finances.find((f) => financeMatchesShipment(f, shipment)) ?? null;
}
