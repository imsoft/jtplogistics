/**
 * Reglas del reloj checador que no dependen de la petición.
 *
 * Fase 1: solo registrar bien. Aquí no se calculan retardos ni faltas — eso
 * llega en la fase 2, cuando RH capture los horarios.
 */

import type { TimeClockMark } from "@prisma/client";

/** Zona horaria de la empresa; toda jornada se fecha con ella. */
export const COMPANY_TZ = "America/Mexico_City";

export const MARK_LABELS: Record<TimeClockMark, string> = {
  clock_in: "Entrada",
  lunch_start: "Salida a comida",
  lunch_end: "Regreso de comida",
  clock_out: "Salida",
};

/**
 * Qué se puede marcar después de qué. Es permisivo a propósito: quien no sale
 * a comer puede irse directo, y quien olvidó regresar de comida puede cerrar
 * su jornada. Lo que falte se señala en el registro, no se impide marcar.
 */
const NEXT_MARKS: Record<"none" | TimeClockMark, TimeClockMark[]> = {
  none: ["clock_in"],
  clock_in: ["lunch_start", "clock_out"],
  lunch_start: ["lunch_end", "clock_out"],
  lunch_end: ["clock_out"],
  clock_out: [],
};

export function allowedMarksAfter(last: TimeClockMark | null): TimeClockMark[] {
  return NEXT_MARKS[last ?? "none"];
}

/** "2026-09-10" del momento dado, en la zona de la empresa. */
export function companyDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: COMPANY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * La columna work_date es DATE: se guarda como medianoche UTC de esa fecha
 * para que no se recorra un día al leerla desde otra zona.
 */
export function workDateFromKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export function workDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/**
 * "09:42:17" en hora de la empresa.
 *
 * Con segundos porque es lo que quedó registrado: en la bitácora de
 * correcciones importa poder decir exactamente qué hora tenía la marca antes.
 */
export function companyTime(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: COMPANY_TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 * Distancia en metros entre dos coordenadas (fórmula del semiverseno). A las
 * distancias de una oficina el error es despreciable y no hace falta librería.
 */
export function distanceInMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/**
 * Qué hacer cuando alguien marca desde una conexión que no es la de la oficina.
 *
 * - `off`   — ni se revisa. La conexión se guarda igual.
 * - `flag`  — se deja marcar y queda señalado para que RH lo mire.
 * - `block` — no se puede marcar fuera de la red autorizada.
 */
export type NetworkMode = "off" | "flag" | "block";

export const NETWORK_MODES: NetworkMode[] = ["off", "flag", "block"];

export interface NetworkPolicy {
  mode: NetworkMode;
  allowedIps: string[];
}

/**
 * Si esta conexión puede marcar.
 *
 * Falla en abierto a propósito: con la lista vacía nunca se bloquea, aunque el
 * modo diga `block`. Una lista mal capturada dejaría a toda la empresa sin
 * poder registrar su entrada, y eso cuesta muchísimo más de lo que protege.
 */
export function isNetworkAllowed(policy: NetworkPolicy, ip: string | null): boolean {
  if (policy.mode !== "block") return true;
  if (policy.allowedIps.length === 0) return true;
  if (!ip) return false;
  return policy.allowedIps.includes(ip);
}

/** Si la conexión merece bandera, sin impedir la marca. */
export function isNetworkForeign(policy: NetworkPolicy, ip: string | null): boolean {
  if (policy.mode === "off") return false;
  if (policy.allowedIps.length === 0) return false;
  return !ip || !policy.allowedIps.includes(ip);
}
