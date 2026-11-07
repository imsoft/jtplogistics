/** Columna "Total" de la tabla de embarques: compra × 12 % + 1,500 × 16 %. */
export const SHIPMENT_TOTAL_COST_RATE = 0.12;
export const SHIPMENT_TOTAL_FIXED_BASE = 1500;
export const SHIPMENT_TOTAL_FIXED_RATE = 0.16;
export const SHIPMENT_TOTAL_FORMULA = "Compra × 12 % + 1,500 × 16 %";

/** Total en MXN redondeado a centavos; sin tarifa de compra no hay total. */
export function shipmentTotal(cost: number | null | undefined): number | null {
  if (cost == null || !Number.isFinite(cost)) return null;
  const total = cost * SHIPMENT_TOTAL_COST_RATE + SHIPMENT_TOTAL_FIXED_BASE * SHIPMENT_TOTAL_FIXED_RATE;
  return Math.round(total * 100) / 100;
}
