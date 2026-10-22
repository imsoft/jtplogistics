/**
 * Motivo por el que se perdió una cotización. Se pide al marcarla rechazada
 * para que los KPIs puedan decir por qué se pierde, no solo cuánto.
 *
 * Puro y sin base de datos, para poder probarlo.
 */

export type QuoteRejectionReason =
  | "precio"
  | "otro_proveedor"
  | "sin_unidad"
  | "tiempo_respuesta"
  | "pospuso"
  | "sin_respuesta"
  | "otro";

export const QUOTE_REJECTION_REASONS: { value: QuoteRejectionReason; label: string }[] = [
  { value: "precio", label: "Precio alto" },
  { value: "otro_proveedor", label: "Eligió a otro proveedor" },
  { value: "sin_unidad", label: "No teníamos unidad disponible" },
  { value: "tiempo_respuesta", label: "Tardamos en responder" },
  { value: "pospuso", label: "El cliente pospuso o canceló" },
  { value: "sin_respuesta", label: "El cliente ya no respondió" },
  { value: "otro", label: "Otro" },
];

export const QUOTE_REJECTION_LABELS = Object.fromEntries(
  QUOTE_REJECTION_REASONS.map((r) => [r.value, r.label])
) as Record<QuoteRejectionReason, string>;

export function isRejectionReason(value: unknown): value is QuoteRejectionReason {
  return typeof value === "string" && QUOTE_REJECTION_REASONS.some((r) => r.value === value);
}

/**
 * Qué guardar del motivo al cambiar el estado:
 *  - a rechazada: el motivo es obligatorio ("otro" además pide detalle).
 *  - a cualquier otro estado: se limpia, porque ya no está perdida.
 *  - sin cambio de estado: no se toca.
 */
export function rejectionUpdate(
  body: { status?: unknown; rejectionReason?: unknown; rejectionNote?: unknown }
):
  | { ok: true; data: { rejectionReason?: string | null; rejectionNote?: string | null } }
  | { ok: false; error: string } {
  if (body.status === undefined) return { ok: true, data: {} };
  if (body.status !== "rechazada") {
    return { ok: true, data: { rejectionReason: null, rejectionNote: null } };
  }
  if (!isRejectionReason(body.rejectionReason)) {
    return { ok: false, error: "Elige por qué se perdió la cotización." };
  }
  const note = typeof body.rejectionNote === "string" ? body.rejectionNote.trim() : "";
  if (body.rejectionReason === "otro" && note.length < 3) {
    return { ok: false, error: "Escribe el motivo." };
  }
  return { ok: true, data: { rejectionReason: body.rejectionReason, rejectionNote: note || null } };
}
