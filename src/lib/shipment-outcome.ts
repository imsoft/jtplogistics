/**
 * Resultado de la entrega de un embarque. El estado "Cerrado" (returned)
 * reemplaza a "Entregado", "Entregado con retraso" o "No entregado", así que el
 * resultado se guarda aparte y sobrevive al cierre: la calificación de
 * transportistas lo necesita.
 *
 * Puro, para probarlo.
 */

export const DELIVERY_OUTCOMES = ["delivered", "delivered_with_delay", "not_delivered"] as const;
export type DeliveryOutcome = (typeof DELIVERY_OUTCOMES)[number];

export function isDeliveryOutcome(value: unknown): value is DeliveryOutcome {
  return typeof value === "string" && (DELIVERY_OUTCOMES as readonly string[]).includes(value);
}

/**
 * Qué resultado queda tras cambiar de estado:
 *  - a un estado de entrega: ese es el resultado.
 *  - a pendiente, en tránsito o en riesgo: el embarque está en camino, no hay resultado.
 *  - a cerrado: se conserva el que tenía.
 */
export function outcomeAfterStatus(nextStatus: string, current: string | null): string | null {
  if (isDeliveryOutcome(nextStatus)) return nextStatus;
  if (nextStatus === "pending" || nextStatus === "in_transit" || nextStatus === "at_risk") return null;
  return current;
}

/** El estado con el que se califica: un cerrado cuenta como su resultado de entrega. */
export function ratingStatus(status: string, outcome: string | null): string {
  if (status === "returned" && isDeliveryOutcome(outcome)) return outcome;
  return status;
}

/** Último resultado de entrega en una lista de cambios de estado, en orden. */
export function outcomeFromHistory(statuses: (string | null)[]): DeliveryOutcome | null {
  let last: DeliveryOutcome | null = null;
  for (const s of statuses) {
    if (isDeliveryOutcome(s)) last = s;
    else if (s === "pending" || s === "in_transit" || s === "at_risk") last = null;
  }
  return last;
}
