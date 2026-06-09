import type { QuoteStatus } from "@prisma/client";

/** Estado almacenado más "vencida", que se calcula a partir de la vigencia. */
export type QuoteStatusDisplay = QuoteStatus | "vencida";

export const QUOTE_STATUS_CONFIG: Record<
  QuoteStatusDisplay,
  { label: string; badgeClass: string }
> = {
  borrador: { label: "Borrador", badgeClass: "bg-gray-100 text-gray-800" },
  enviada: { label: "Enviada", badgeClass: "bg-blue-100 text-blue-800" },
  negociacion: { label: "En negociación", badgeClass: "bg-amber-100 text-amber-800" },
  aceptada: { label: "Aceptada", badgeClass: "bg-green-100 text-green-800" },
  rechazada: { label: "Rechazada", badgeClass: "bg-red-100 text-red-800" },
  vencida: { label: "Vencida", badgeClass: "bg-orange-100 text-orange-800" },
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

/**
 * Devuelve el estado a mostrar: si una cotización enviada o en negociación ya
 * pasó su vigencia, se muestra como "vencida". Los estados aceptada/rechazada
 * y borrador no se marcan como vencidos.
 */
export function getQuoteDisplayStatus(
  status: QuoteStatus,
  validUntil: string | Date
): QuoteStatusDisplay {
  if (status === "enviada" || status === "negociacion") {
    const limit = new Date(validUntil);
    // Vence al terminar el día de vigencia (comparación por fecha, no hora).
    limit.setHours(23, 59, 59, 999);
    if (limit.getTime() < Date.now()) return "vencida";
  }
  return status;
}
