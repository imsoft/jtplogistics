/**
 * Qué WhatsApp le llega al cliente cuando cambia el estado de su embarque.
 * Puro, para poder probarlo; el envío está en whatsapp-auto.ts.
 *
 * - Entregado / entregado con retraso → jtp_embarque_entregado.
 * - Retraso por tráfico e incidencias → jtp_embarque_retraso.
 * - "Pendiente" y "Cerrado" son internos: no se avisa.
 * - Cualquier otro cambio → jtp_estado_embarque.
 */
import { shipmentStatusDef, shipmentStatusLabel } from "@/lib/shipment-statuses";
import { trackingDate } from "@/lib/shipment-tracking";

export interface StatusMessageShipment {
  eco: string | null;
  origin: string | null;
  destination: string | null;
  deliveryDate: Date | string | null;
  status: string;
}

export interface StatusMessage {
  template: "jtp_estado_embarque" | "jtp_embarque_retraso" | "jtp_embarque_entregado";
  params: string[];
}

/** Estados que no se le avisan al cliente. */
export const SILENT_STATUSES = new Set(["pending", "returned"]);
const DELIVERED = new Set(["delivered", "delivered_with_delay"]);

/** Meta rechaza variables vacías: siempre va algo legible. */
const or = (v: string | null | undefined, fallback: string) => (v && v.trim() ? v.trim() : fallback);

/** El mensaje para ese cambio de estado, o null si no se avisa. `recipientName` es a quién se saluda. */
export function statusMessageFor(s: StatusMessageShipment, recipientName: string): StatusMessage | null {
  if (SILENT_STATUSES.has(s.status) || !shipmentStatusDef(s.status)) return null;
  const eco = or(s.eco, "SIN ECO");
  const name = or(recipientName, "CLIENTE");
  if (DELIVERED.has(s.status)) {
    return { template: "jtp_embarque_entregado", params: [name, eco, or(s.destination, "SU DESTINO")] };
  }
  const def = shipmentStatusDef(s.status);
  if (s.status === "traffic_delay" || def?.group === "incident") {
    return { template: "jtp_embarque_retraso", params: [name, eco, shipmentStatusLabel(s.status)] };
  }
  const delivery = trackingDate(s.deliveryDate);
  return {
    template: "jtp_estado_embarque",
    params: [
      eco,
      [s.origin, s.destination].filter((x) => x && x.trim()).join(" - ") || "SIN RUTA",
      shipmentStatusLabel(s.status),
      delivery === "—" ? "POR CONFIRMAR" : delivery,
    ],
  };
}
