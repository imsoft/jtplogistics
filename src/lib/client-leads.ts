/**
 * CRM de clientes: etapas del embudo de venta, origen del prospecto y tipos
 * de actividad.
 *
 * Puro y sin base de datos, para poder probarlo. El orden de LEAD_STAGES es
 * el del embudo; perdido va al final porque no es un avance, es una salida.
 */

export type LeadStage = "prospecto" | "contactado" | "cotizado" | "negociacion" | "ganado" | "perdido";
export type LeadSource =
  | "referido"
  | "llamada"
  | "sitio_web"
  | "redes_sociales"
  | "expo"
  | "cliente_actual"
  | "otro";
export type LeadActivityType = "llamada" | "correo" | "whatsapp" | "reunion" | "visita" | "cotizacion" | "nota";

export const LEAD_STAGES: { value: LeadStage; label: string; badgeClass: string }[] = [
  { value: "prospecto", label: "Prospecto", badgeClass: "bg-gray-100 text-gray-800" },
  { value: "contactado", label: "Contactado", badgeClass: "bg-blue-100 text-blue-800" },
  { value: "cotizado", label: "Cotizado", badgeClass: "bg-blue-200 text-blue-900" },
  { value: "negociacion", label: "En negociación", badgeClass: "bg-amber-100 text-amber-800" },
  { value: "ganado", label: "Ganado", badgeClass: "bg-green-100 text-green-800" },
  { value: "perdido", label: "Perdido", badgeClass: "bg-red-100 text-red-800" },
];

export const LEAD_SOURCES: { value: LeadSource; label: string }[] = [
  { value: "referido", label: "Recomendación" },
  { value: "llamada", label: "Llamada en frío" },
  { value: "sitio_web", label: "Sitio web" },
  { value: "redes_sociales", label: "Redes sociales" },
  { value: "expo", label: "Expo o evento" },
  { value: "cliente_actual", label: "Cliente actual (nueva ruta)" },
  { value: "otro", label: "Otro" },
];

export const LEAD_ACTIVITY_TYPES: { value: LeadActivityType; label: string }[] = [
  { value: "llamada", label: "Llamada" },
  { value: "correo", label: "Correo" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "reunion", label: "Reunión" },
  { value: "visita", label: "Visita" },
  { value: "cotizacion", label: "Cotización enviada" },
  { value: "nota", label: "Nota" },
];

function labelsOf<T extends string>(list: { value: T; label: string }[]): Record<T, string> {
  return Object.fromEntries(list.map((x) => [x.value, x.label])) as Record<T, string>;
}

export const LEAD_STAGE_LABELS = labelsOf(LEAD_STAGES);
export const LEAD_SOURCE_LABELS = labelsOf(LEAD_SOURCES);
export const LEAD_ACTIVITY_LABELS = labelsOf(LEAD_ACTIVITY_TYPES);

export const LEAD_STAGE_VALUES = LEAD_STAGES.map((s) => s.value);
export const LEAD_SOURCE_VALUES = LEAD_SOURCES.map((s) => s.value);
export const LEAD_ACTIVITY_VALUES = LEAD_ACTIVITY_TYPES.map((s) => s.value);

export function isLeadStage(value: unknown): value is LeadStage {
  return typeof value === "string" && (LEAD_STAGE_VALUES as string[]).includes(value);
}

export function isLeadActivityType(value: unknown): value is LeadActivityType {
  return typeof value === "string" && (LEAD_ACTIVITY_VALUES as string[]).includes(value);
}

/** Perder un prospecto exige motivo: meses después nadie se acuerda de por qué. */
export function requiresLostReason(stage: LeadStage): boolean {
  return stage === "perdido";
}

/** Ganado y perdido cierran el seguimiento: ya no generan recordatorios. */
export function isOpenStage(stage: LeadStage): boolean {
  return stage !== "ganado" && stage !== "perdido";
}

export type FollowUpState = "vencido" | "hoy" | "proximo";

/**
 * Cómo va el próximo seguimiento respecto a hoy. Las dos fechas son
 * "YYYY-MM-DD" en la zona de la empresa; un prospecto cerrado no tiene
 * seguimiento pendiente aunque conserve la fecha.
 */
export function followUpState(
  nextFollowUpOn: string | null,
  todayKey: string,
  stage: LeadStage
): FollowUpState | null {
  if (!nextFollowUpOn || !isOpenStage(stage)) return null;
  if (nextFollowUpOn < todayKey) return "vencido";
  if (nextFollowUpOn === todayKey) return "hoy";
  return "proximo";
}
