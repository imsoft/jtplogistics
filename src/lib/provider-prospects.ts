/**
 * Prospección de proveedores: etapas, origen del contacto y cobertura.
 *
 * Puro y sin base de datos, para poder probarlo. El orden de PROSPECT_STATUSES
 * es el del embudo, de pendiente a listo para operar; descartado va al final
 * porque no es un avance, es una salida.
 */

export type ProspectStatus =
  | "pendiente"
  | "prospectando"
  | "negociando"
  | "en_alta"
  | "listo"
  | "descartado";

export type ProspectSource = "carretera" | "whatsapp" | "internet" | "calle";
export type ProspectCoverage = "nacional" | "internacional" | "ambas";

export const PROSPECT_STATUSES: {
  value: ProspectStatus;
  label: string;
  badgeClass: string;
}[] = [
  { value: "pendiente", label: "Pendiente de prospectar", badgeClass: "bg-gray-100 text-gray-800" },
  { value: "prospectando", label: "Prospectando", badgeClass: "bg-blue-100 text-blue-800" },
  { value: "negociando", label: "Negociando", badgeClass: "bg-amber-100 text-amber-800" },
  { value: "en_alta", label: "En proceso de alta", badgeClass: "bg-indigo-100 text-indigo-800" },
  { value: "listo", label: "Listo para operar", badgeClass: "bg-green-100 text-green-800" },
  { value: "descartado", label: "Descartado", badgeClass: "bg-red-100 text-red-800" },
];

export const PROSPECT_SOURCES: { value: ProspectSource; label: string }[] = [
  { value: "carretera", label: "Carretera" },
  { value: "whatsapp", label: "Grupo de WhatsApp" },
  { value: "internet", label: "Internet" },
  { value: "calle", label: "Calle" },
];

export const PROSPECT_COVERAGES: { value: ProspectCoverage; label: string }[] = [
  { value: "nacional", label: "Nacional" },
  { value: "internacional", label: "Internacional" },
  { value: "ambas", label: "Nacional e internacional" },
];

function labelsOf<T extends string>(list: { value: T; label: string }[]): Record<T, string> {
  return Object.fromEntries(list.map((x) => [x.value, x.label])) as Record<T, string>;
}

export const PROSPECT_STATUS_LABELS = labelsOf(PROSPECT_STATUSES);
export const PROSPECT_SOURCE_LABELS = labelsOf(PROSPECT_SOURCES);
export const PROSPECT_COVERAGE_LABELS = labelsOf(PROSPECT_COVERAGES);

export const PROSPECT_STATUS_VALUES = PROSPECT_STATUSES.map((s) => s.value);
export const PROSPECT_SOURCE_VALUES = PROSPECT_SOURCES.map((s) => s.value);
export const PROSPECT_COVERAGE_VALUES = PROSPECT_COVERAGES.map((s) => s.value);

/**
 * Descartar exige motivo: se puede descartar desde cualquier etapa y meses
 * después nadie se acuerda de por qué. En las demás etapas no se pide.
 */
export function requiresDiscardReason(status: ProspectStatus): boolean {
  return status === "descartado";
}

/** Las etapas del embudo, sin descartado: sirve para contar el avance. */
export function pipelineStatuses(): ProspectStatus[] {
  return PROSPECT_STATUS_VALUES.filter((s) => s !== "descartado");
}

export function isProspectStatus(value: unknown): value is ProspectStatus {
  return typeof value === "string" && (PROSPECT_STATUS_VALUES as string[]).includes(value);
}
