/**
 * Configuración de la oficina para el checador, guardada en `settings`.
 *
 * Vive en la base y no en variables de entorno para que dirección pueda
 * moverla sin volver a desplegar. Mientras no esté capturada, el checador
 * funciona igual: simplemente no calcula distancia.
 */

import { prisma } from "@/lib/db";

export const OFFICE_LAT_KEY = "time_clock_office_lat";
export const OFFICE_LNG_KEY = "time_clock_office_lng";
export const OFFICE_RADIUS_KEY = "time_clock_office_radius_m";

/** Radio por defecto: cubre un edificio y su banqueta sin abarcar la cuadra. */
export const DEFAULT_RADIUS_M = 150;

export interface OfficeGeofence {
  lat: number;
  lng: number;
  radiusM: number;
}

export async function loadOfficeGeofence(): Promise<OfficeGeofence | null> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: [OFFICE_LAT_KEY, OFFICE_LNG_KEY, OFFICE_RADIUS_KEY] } },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));

  const lat = Number(map.get(OFFICE_LAT_KEY));
  const lng = Number(map.get(OFFICE_LNG_KEY));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const radius = Number(map.get(OFFICE_RADIUS_KEY));
  return {
    lat,
    lng,
    radiusM: Number.isFinite(radius) && radius > 0 ? radius : DEFAULT_RADIUS_M,
  };
}
