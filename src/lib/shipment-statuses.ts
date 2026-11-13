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

export type ShipmentStatusGroup = "start" | "load" | "route" | "wait" | "stop" | "unload" | "incident" | "result";

/** Etapas para agrupar la lista (en el menú de la tabla). */
export const SHIPMENT_STATUS_GROUPS: { value: ShipmentStatusGroup; label: string }[] = [
  { value: "start", label: "Inicio" },
  { value: "load", label: "Carga" },
  { value: "route", label: "En ruta" },
  { value: "wait", label: "Esperas" },
  { value: "stop", label: "Paradas" },
  { value: "unload", label: "Descarga" },
  { value: "incident", label: "Incidencias" },
  { value: "result", label: "Resultado" },
];

export interface ShipmentStatusDef {
  value: string;
  label: string;
  group: ShipmentStatusGroup;
  /** Clases del badge en la plataforma (color por etapa). */
  badgeClass: string;
  /** Fondo de la fila en la tabla (vacío: sin color). */
  rowClass: string;
  /** Color sólido del estatus en la imagen de seguimiento. */
  solid: string;
  active: boolean;
}

export const SHIPMENT_STATUSES = [
  { value: "pending", label: "Pendiente", group: "start", badgeClass: "bg-gray-100 text-gray-800", rowClass: "", solid: "#1F2937", active: true },
  { value: "awaiting_load", label: "Unidad en espera de carga", group: "load", badgeClass: "bg-sky-100 text-sky-800", rowClass: "", solid: "#0369A1", active: true },
  { value: "awaiting_load_ramp", label: "Unidad en espera de rampa para carga", group: "load", badgeClass: "bg-sky-100 text-sky-800", rowClass: "", solid: "#0369A1", active: true },
  { value: "ramp_awaiting_load", label: "Unidad en rampa en espera de carga", group: "load", badgeClass: "bg-sky-100 text-sky-800", rowClass: "", solid: "#0369A1", active: true },
  { value: "load_started", label: "Unidad inicia carga", group: "load", badgeClass: "bg-sky-100 text-sky-800", rowClass: "", solid: "#0369A1", active: true },
  { value: "loading", label: "Unidad en proceso de carga", group: "load", badgeClass: "bg-sky-100 text-sky-800", rowClass: "", solid: "#0369A1", active: true },
  { value: "route_started", label: "Unidad inicia ruta", group: "route", badgeClass: "bg-blue-100 text-blue-800", rowClass: "", solid: "#1E40AF", active: true },
  { value: "on_route", label: "Unidad en ruta", group: "route", badgeClass: "bg-blue-100 text-blue-800", rowClass: "", solid: "#1E40AF", active: true },
  { value: "in_transit", label: "Unidad en tránsito", group: "route", badgeClass: "bg-blue-100 text-blue-800", rowClass: "", solid: "#1E40AF", active: true },
  { value: "near_destination", label: "Unidad próxima a destino", group: "route", badgeClass: "bg-blue-100 text-blue-800", rowClass: "", solid: "#1E40AF", active: true },
  { value: "first_delivery", label: "Unidad en primera entrega", group: "route", badgeClass: "bg-blue-100 text-blue-800", rowClass: "", solid: "#1E40AF", active: true },
  { value: "traffic_delay", label: "Unidad en retraso por tráfico", group: "wait", badgeClass: "bg-amber-100 text-amber-800", rowClass: "", solid: "#B45309", active: true },
  { value: "awaiting_entry", label: "Unidad en espera de ingreso", group: "wait", badgeClass: "bg-amber-100 text-amber-800", rowClass: "", solid: "#B45309", active: true },
  { value: "awaiting_papers", label: "Unidad en espera de papeles", group: "wait", badgeClass: "bg-amber-100 text-amber-800", rowClass: "", solid: "#B45309", active: true },
  { value: "awaiting_restriction_end", label: "Unidad en espera de término de restricción", group: "wait", badgeClass: "bg-amber-100 text-amber-800", rowClass: "", solid: "#B45309", active: true },
  { value: "awaiting_reschedule", label: "Unidad en espera de reagenda", group: "wait", badgeClass: "bg-amber-100 text-amber-800", rowClass: "", solid: "#B45309", active: true },
  { value: "resting", label: "Unidad en descanso", group: "stop", badgeClass: "bg-violet-100 text-violet-800", rowClass: "", solid: "#6D28D9", active: true },
  { value: "meal_stop", label: "Unidad detenida alimentos op", group: "stop", badgeClass: "bg-violet-100 text-violet-800", rowClass: "", solid: "#6D28D9", active: true },
  { value: "checkpoint", label: "Unidad en registro", group: "stop", badgeClass: "bg-violet-100 text-violet-800", rowClass: "", solid: "#6D28D9", active: true },
  { value: "near_safe_yard", label: "Unidad próxima a resguardo", group: "stop", badgeClass: "bg-violet-100 text-violet-800", rowClass: "", solid: "#6D28D9", active: true },
  { value: "safe_yard", label: "Unidad resguardar en patio seguro", group: "stop", badgeClass: "bg-violet-100 text-violet-800", rowClass: "", solid: "#6D28D9", active: true },
  { value: "entered_awaiting_ramp", label: "Unidad ingresada en espera de rampa", group: "unload", badgeClass: "bg-teal-100 text-teal-800", rowClass: "", solid: "#0F766E", active: true },
  { value: "awaiting_unload_entry", label: "Unidad en espera de ingreso a descarga", group: "unload", badgeClass: "bg-teal-100 text-teal-800", rowClass: "", solid: "#0F766E", active: true },
  { value: "entered_awaiting_unload", label: "Unidad ingresada en espera de descarga", group: "unload", badgeClass: "bg-teal-100 text-teal-800", rowClass: "", solid: "#0F766E", active: true },
  { value: "awaiting_unload", label: "Unidad en espera de descarga", group: "unload", badgeClass: "bg-teal-100 text-teal-800", rowClass: "", solid: "#0F766E", active: true },
  { value: "at_ramp", label: "Unidad en rampa", group: "unload", badgeClass: "bg-teal-100 text-teal-800", rowClass: "", solid: "#0F766E", active: true },
  { value: "ramp_awaiting_unload", label: "Unidad en rampa en espera de descarga", group: "unload", badgeClass: "bg-teal-100 text-teal-800", rowClass: "", solid: "#0F766E", active: true },
  { value: "unload_started", label: "Unidad inicia descarga", group: "unload", badgeClass: "bg-teal-100 text-teal-800", rowClass: "", solid: "#0F766E", active: true },
  { value: "unloading", label: "Unidad en descarga", group: "unload", badgeClass: "bg-teal-100 text-teal-800", rowClass: "", solid: "#0F766E", active: true },
  { value: "unload_in_process", label: "Unidad en proceso de descarga", group: "unload", badgeClass: "bg-teal-100 text-teal-800", rowClass: "", solid: "#0F766E", active: true },
  { value: "unload_completed", label: "Se concluye descarga", group: "unload", badgeClass: "bg-teal-100 text-teal-800", rowClass: "", solid: "#0F766E", active: true },
  { value: "stopped_blockade", label: "Unidad detenida por bloqueo", group: "incident", badgeClass: "bg-red-100 text-red-800", rowClass: "", solid: "#B91C1C", active: true },
  { value: "tire_repair", label: "Unidad realizando talacha", group: "incident", badgeClass: "bg-red-100 text-red-800", rowClass: "", solid: "#B91C1C", active: true },
  { value: "stopped_breakdown", label: "Unidad detenida por falla mecánica", group: "incident", badgeClass: "bg-red-100 text-red-800", rowClass: "", solid: "#B91C1C", active: true },
  { value: "crashed", label: "Unidad siniestrada", group: "incident", badgeClass: "bg-red-100 text-red-800", rowClass: "", solid: "#B91C1C", active: true },
  { value: "false_freight", label: "Flete en falso", group: "incident", badgeClass: "bg-red-100 text-red-800", rowClass: "", solid: "#B91C1C", active: true },
  { value: "at_risk", label: "En riesgo", group: "incident", badgeClass: "bg-red-100 text-red-800", rowClass: "bg-red-50", solid: "#991B1B", active: true },
  { value: "delivered", label: "Entregado", group: "result", badgeClass: "bg-blue-200 text-blue-900", rowClass: "bg-blue-50", solid: "#1E3A8A", active: false },
  { value: "delivered_with_delay", label: "Entregado con retraso", group: "result", badgeClass: "bg-amber-100 text-amber-800", rowClass: "bg-amber-50", solid: "#92400E", active: false },
  { value: "not_delivered", label: "No entregado", group: "result", badgeClass: "bg-red-200 text-red-900", rowClass: "bg-red-50", solid: "#7F1D1D", active: false },
  { value: "returned", label: "Cerrado", group: "result", badgeClass: "bg-green-100 text-green-800", rowClass: "bg-green-50", solid: "#166534", active: false },
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
