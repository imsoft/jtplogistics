/**
 * Los estados de un embarque, en un solo lugar: nombre, colores y orden. Los
 * usan la tabla, el formulario, el dashboard, el Excel y la imagen de
 * seguimiento. Para agregar uno: aquí, en el enum ShipmentStatus de Prisma
 * (con su migración) y en el tipo ShipmentStatus.
 *
 * `active`: el embarque va en camino (todavía no hay resultado de entrega).
 *
 * Puro, para poder probarlo.
 */

export interface ShipmentStatusDef {
  value: string;
  label: string;
  /** Clases del badge en la plataforma. */
  badgeClass: string;
  /** Fondo de la fila en la tabla (vacío: sin color). */
  rowClass: string;
  /** Color sólido del estatus en la imagen de seguimiento. */
  solid: string;
  active: boolean;
}

export const SHIPMENT_STATUSES = [
  { value: "pending", label: "Pendiente", badgeClass: "bg-gray-100 text-gray-800", rowClass: "", solid: "#1F2937", active: true },
  { value: "in_transit", label: "Unidad en tránsito", badgeClass: "bg-blue-100 text-blue-800", rowClass: "", solid: "#1E40AF", active: true },
  { value: "traffic_delay", label: "Unidad en retraso por tráfico", badgeClass: "bg-amber-100 text-amber-800", rowClass: "", solid: "#B45309", active: true },
  { value: "awaiting_entry", label: "Unidad en espera de ingreso", badgeClass: "bg-sky-100 text-sky-800", rowClass: "", solid: "#0369A1", active: true },
  { value: "awaiting_papers", label: "Unidad en espera de papeles", badgeClass: "bg-sky-100 text-sky-800", rowClass: "", solid: "#0369A1", active: true },
  { value: "meal_stop", label: "Unidad detenida alimentos op", badgeClass: "bg-orange-100 text-orange-800", rowClass: "", solid: "#C2410C", active: true },
  { value: "safe_yard", label: "Unidad resguardar en patio seguro", badgeClass: "bg-orange-100 text-orange-800", rowClass: "", solid: "#C2410C", active: true },
  { value: "checkpoint", label: "Unidad en registro", badgeClass: "bg-violet-100 text-violet-800", rowClass: "", solid: "#6D28D9", active: true },
  { value: "awaiting_unload", label: "Unidad en espera de descarga", badgeClass: "bg-yellow-100 text-yellow-800", rowClass: "", solid: "#A16207", active: true },
  { value: "first_delivery", label: "Unidad en primera entrega", badgeClass: "bg-teal-100 text-teal-800", rowClass: "", solid: "#0F766E", active: true },
  { value: "at_ramp", label: "Unidad en rampa", badgeClass: "bg-teal-100 text-teal-800", rowClass: "", solid: "#0F766E", active: true },
  { value: "at_risk", label: "En riesgo", badgeClass: "bg-red-100 text-red-800", rowClass: "bg-red-50", solid: "#991B1B", active: true },
  { value: "delivered", label: "Entregado", badgeClass: "bg-blue-200 text-blue-900", rowClass: "bg-blue-50", solid: "#1E3A8A", active: false },
  { value: "delivered_with_delay", label: "Entregado con retraso", badgeClass: "bg-amber-100 text-amber-800", rowClass: "bg-amber-50", solid: "#92400E", active: false },
  { value: "not_delivered", label: "No entregado", badgeClass: "bg-red-200 text-red-900", rowClass: "bg-red-50", solid: "#7F1D1D", active: false },
  { value: "returned", label: "Cerrado", badgeClass: "bg-green-100 text-green-800", rowClass: "bg-green-50", solid: "#166534", active: false },
] as const satisfies readonly ShipmentStatusDef[];

export type ShipmentStatusValue = (typeof SHIPMENT_STATUSES)[number]["value"];

export const SHIPMENT_STATUS_VALUES: readonly ShipmentStatusValue[] = SHIPMENT_STATUSES.map((s) => s.value);

const BY_VALUE = new Map<string, ShipmentStatusDef>(SHIPMENT_STATUSES.map((s) => [s.value, s]));

export function isShipmentStatus(v: unknown): v is ShipmentStatusValue {
  return typeof v === "string" && BY_VALUE.has(v);
}

export function shipmentStatusDef(v: string): ShipmentStatusDef | undefined {
  return BY_VALUE.get(v);
}

export function shipmentStatusLabel(v: string): string {
  return BY_VALUE.get(v)?.label ?? v;
}

/** El embarque va en camino: todavía no hay resultado de entrega. */
export function isActiveShipmentStatus(v: string): boolean {
  return BY_VALUE.get(v)?.active ?? false;
}
