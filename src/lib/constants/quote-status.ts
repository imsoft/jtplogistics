import type { QuoteStatus } from "@prisma/client";

/** Estado almacenado más "vencida", que se calcula a partir de la vigencia. */
export type QuoteStatusDisplay = QuoteStatus | "vencida";

export const QUOTE_STATUS_CONFIG: Record<
  QuoteStatusDisplay,
  { label: string; badgeClass: string }
> = {
  borrador: { label: "Borrador", badgeClass: "border border-dashed border-gray-300 bg-white text-gray-700" },
  enviada: { label: "Enviada", badgeClass: "bg-blue-100 text-blue-800" },
  negociacion: { label: "En negociación", badgeClass: "bg-amber-100 text-amber-800" },
  aceptada: { label: "Aceptada", badgeClass: "bg-green-100 text-green-800" },
  rechazada: { label: "Rechazada", badgeClass: "bg-red-100 text-red-800" },
  vencida: { label: "Vencida", badgeClass: "bg-gray-200 text-gray-700" },
};

/** Estados que el usuario puede asignar manualmente (no incluye "vencida"). */
export const QUOTE_STATUS_OPTIONS: { value: QuoteStatus; label: string }[] = [
  { value: "borrador", label: "Borrador" },
  { value: "enviada", label: "Enviada" },
  { value: "negociacion", label: "En negociación" },
  { value: "aceptada", label: "Aceptada" },
  { value: "rechazada", label: "Rechazada" },
];

export const QUOTE_STATUS_VALUES: QuoteStatus[] = QUOTE_STATUS_OPTIONS.map(
  (o) => o.value
);

/** "YYYY-MM-DD" de hoy en la zona de la empresa (Guadalajara). */
function mexicoDateKey(now: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/**
 * Si ya pasó la vigencia. La vigencia es una fecha de calendario guardada a
 * medianoche UTC: se compara como fecha contra el día de hoy en México (vence
 * al terminar ese día), no con la hora del navegador o del servidor.
 */
export function validityPassed(validUntil: string | Date, now: Date): boolean {
  const iso = typeof validUntil === "string" ? validUntil : validUntil.toISOString();
  return iso.slice(0, 10) < mexicoDateKey(now);
}

/**
 * Devuelve el estado a mostrar: si una cotización enviada o en negociación ya
 * pasó su vigencia, se muestra como "vencida". Los estados aceptada/rechazada
 * y borrador no se marcan como vencidos.
 */
export function getQuoteDisplayStatus(
  status: QuoteStatus,
  validUntil: string | Date
): QuoteStatusDisplay {
  if ((status === "enviada" || status === "negociacion") && validityPassed(validUntil, new Date())) return "vencida";
  return status;
}
