/**
 * Evaluación de transportistas: puntajes a partir de sus embarques, estrellas
 * en medias (4.5) y agrupación por mes. Puro, para probarlo; lo usan el
 * rating de admin y "Mis evaluaciones" del proveedor.
 */

import { ratingStatus } from "./shipment-outcome";

export interface ShipmentForScore {
  status: string;
  deliveryOutcome: string | null;
  incident: string | null;
}

export interface ScoreStats {
  total: number;
  delivered: number;
  deliveredWithDelay: number;
  notDelivered: number;
  /** Pendiente, en tránsito o en riesgo: todavía en camino. */
  inTransit: number;
  withIncident: number;
  /** 0–100; null sin embarques con entrega registrada. */
  punctualityScore: number | null;
  incidentFreeScore: number;
  deliveryRateScore: number | null;
  /** 0–100 ponderado. */
  overallScore: number;
}

function hasIncident(value: string | null): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v !== "" && v !== "no";
}

/**
 * Puntajes de un grupo de embarques. Puntualidad 40 %, sin incidencias 30 % y
 * tasa de entrega 30 %. Un cerrado cuenta con el resultado de su entrega; si
 * no se sabe cómo llegó, se deja fuera. null si no queda ninguno.
 */
export function scoreShipments(list: ShipmentForScore[]): ScoreStats | null {
  const d = { total: 0, delivered: 0, deliveredWithDelay: 0, notDelivered: 0, inTransit: 0, withIncident: 0 };
  for (const s of list) {
    const st = ratingStatus(s.status, s.deliveryOutcome);
    if (st === "returned") continue;
    d.total += 1;
    if (st === "delivered") d.delivered += 1;
    else if (st === "delivered_with_delay") d.deliveredWithDelay += 1;
    else if (st === "not_delivered") d.notDelivered += 1;
    else d.inTransit += 1;
    if (hasIncident(s.incident)) d.withIncident += 1;
  }
  if (d.total === 0) return null;

  const closed = d.delivered + d.deliveredWithDelay + d.notDelivered;
  const punctuality = closed > 0 ? ((d.delivered + d.deliveredWithDelay * 0.5) / closed) * 100 : null;
  const incidentFree = ((d.total - d.withIncident) / d.total) * 100;
  const deliveryRate = closed > 0 ? ((d.delivered + d.deliveredWithDelay) / closed) * 100 : null;
  const overall =
    punctuality !== null && deliveryRate !== null ? punctuality * 0.4 + incidentFree * 0.3 + deliveryRate * 0.3 : incidentFree;

  return {
    ...d,
    punctualityScore: punctuality !== null ? Math.round(punctuality) : null,
    incidentFreeScore: Math.round(incidentFree),
    deliveryRateScore: deliveryRate !== null ? Math.round(deliveryRate) : null,
    overallScore: Math.round(overall),
  };
}

/** Puntaje 0–100 → estrellas de 1 a 5 en medias (90 → 4.5, 100 → 5). */
export function scoreToStars(score: number): number {
  return Math.min(5, Math.max(1, Math.round(score / 10) / 2));
}

/** 1, 1.5, 2 … 5. */
export function isHalfStar(value: unknown): value is number {
  return typeof value === "number" && value >= 1 && value <= 5 && Number.isInteger(value * 2);
}

/** La calificación que cuenta: la de JTP si la puso; si no, la automática. */
export function finalStars(auto: number | null, manual: number | null): number | null {
  return manual ?? auto;
}

/** "YYYY-MM" de una fecha, en la zona de la empresa. */
export function monthKeyOf(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit" }).format(date).slice(0, 7);
}

/** El mes de un embarque: el de su recolección; si no tiene, el de entrega o el de captura. */
export function shipmentMonth(s: { pickupDate: Date | null; deliveryDate: Date | null; createdAt: Date }): string {
  return monthKeyOf(s.pickupDate ?? s.deliveryDate ?? s.createdAt);
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "2026-10" → "octubre 2026". */
export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return y && m ? `${MONTHS[m - 1]} ${y}` : key;
}

/** "YYYY-MM" válido. */
export function isMonthKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}
