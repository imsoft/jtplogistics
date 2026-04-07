import type { Finance, Shipment } from "@prisma/client";

/**
 * Misma lógica de coincidencia que al crear finanzas desde un embarque cerrado:
 * eco, cliente, origen, destino; y fechas solo si el embarque las tiene.
 */
export function financeMatchesShipment(f: Finance, s: Shipment): boolean {
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
  for (const f of finances) {
    if (financeMatchesShipment(f, shipment)) return f;
  }
  return null;
}
