/**
 * Datos de la imagen de seguimiento que JTP manda a sus clientes (una tarjeta
 * cuadrada por embarque). Mismos campos que su Excel "Seguimiento JTP"; el
 * comentario es el estado del embarque (decisión del cliente).
 *
 * Puro, para poder probarlo.
 */
import { readCartaPorte } from "@/lib/carta-porte";

export const TRACKING_STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  pending: { label: "Pendiente", bg: "#E5E7EB", fg: "#1F2937" },
  in_transit: { label: "En tránsito", bg: "#DBEAFE", fg: "#1E40AF" },
  delivered: { label: "Entregado", bg: "#BFDBFE", fg: "#1E3A8A" },
  delivered_with_delay: { label: "Entregado con retraso", bg: "#FEF3C7", fg: "#92400E" },
  not_delivered: { label: "No entregado", bg: "#FECACA", fg: "#7F1D1D" },
  at_risk: { label: "En riesgo", bg: "#FEE2E2", fg: "#991B1B" },
  returned: { label: "Cerrado", bg: "#DCFCE7", fg: "#166534" },
};

export interface TrackingSource {
  eco: string | null;
  client: string | null;
  origin: string | null;
  destination: string | null;
  pickupDate: Date | string | null;
  deliveryDate: Date | string | null;
  operatorName: string | null;
  status: string;
  cartaPorte?: unknown;
}

export interface TrackingCard {
  eco: string;
  client: string;
  origin: string;
  destination: string;
  /** Empresa que recibe (destinatario de la carta porte). */
  finalDestination: string;
  pickupDate: string;
  deliveryDate: string;
  deliveryTime: string;
  operator: string;
  status: { label: string; bg: string; fg: string };
}

const dash = (v: string | null | undefined) => (v && v.trim() ? v.trim() : "—");

/** Fecha guardada como día ("2026-11-12T00:00:00Z") → "12/11/2026", sin correrse por zona horaria. */
export function trackingDate(v: Date | string | null | undefined): string {
  if (!v) return "—";
  const iso = typeof v === "string" ? v : v.toISOString();
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "—";
}

/** "2026-11-13T14:00" → "2:00 p. m."; sin hora → "—". */
export function trackingTime(dateTime: string | null | undefined): string {
  const m = (dateTime ?? "").match(/T(\d{2}):(\d{2})/);
  if (!m) return "—";
  const h = Number(m[1]);
  const suffix = h < 12 ? "a. m." : "p. m.";
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${suffix}`;
}

export function trackingCard(s: TrackingSource): TrackingCard {
  const cp = s.cartaPorte ? readCartaPorte(s.cartaPorte) : null;
  return {
    eco: dash(s.eco),
    client: dash(s.client),
    origin: dash(s.origin),
    destination: dash(s.destination),
    finalDestination: dash(cp?.destination.name),
    pickupDate: trackingDate(s.pickupDate),
    deliveryDate: trackingDate(s.deliveryDate),
    deliveryTime: trackingTime(cp?.destination.dateTime),
    operator: dash(s.operatorName),
    status: TRACKING_STATUS[s.status] ?? { label: s.status, bg: "#E5E7EB", fg: "#1F2937" },
  };
}

/** Nombre del archivo: "seguimiento-J-16353.png". */
export function trackingFileName(eco: string | null | undefined): string {
  const clean = (eco ?? "").replace(/[^\w-]+/g, "");
  return `seguimiento${clean ? `-${clean}` : ""}.png`;
}
