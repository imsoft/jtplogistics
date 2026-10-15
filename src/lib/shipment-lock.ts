/**
 * Cuándo un embarque queda de solo lectura. Puro, para probarlo y para que
 * pantalla y servidor apliquen exactamente la misma regla.
 *
 * - Cerrado: siempre fue así.
 * - Sin incidencias: lo pidió el cliente. Si ya quedó asentado que no hubo
 *   incidencia, la ficha se consulta como un perfil, no se edita.
 *
 * En los dos casos dirección puede desbloquear confirmando su correo.
 */

import { incidentAllowsIncidentType } from "@/lib/incident-yes-no";

export type ShipmentLockReason = "closed" | "no_incident" | null;

export function shipmentLockReason(s: { status?: string | null; incident?: string | null }): ShipmentLockReason {
  if (s.status === "returned") return "closed";
  const incident = (s.incident ?? "").trim();
  if (incident && !incidentAllowsIncidentType(incident)) return "no_incident";
  return null;
}

export const LOCK_TEXT: Record<Exclude<ShipmentLockReason, null>, { title: string; body: string; button: string }> = {
  closed: {
    title: "Embarque cerrado",
    body: "Este embarque está cerrado. Escribe tu correo electrónico para verificar que quieres editarlo.",
    button: "Reabrir para editar",
  },
  no_incident: {
    title: "Embarque sin incidencias",
    body: "Este embarque quedó registrado sin incidencias y se consulta como un perfil: no se edita. Si de verdad hay que corregirlo, escribe tu correo electrónico para desbloquearlo.",
    button: "Desbloquear para editar",
  },
};
