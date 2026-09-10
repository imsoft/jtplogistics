/**
 * Configuración del checador, guardada en `settings`.
 *
 * Vive en la base y no en variables de entorno para que dirección pueda
 * moverla sin volver a desplegar — que es justo lo que hace falta cuando el
 * proveedor cambia la IP de la oficina.
 */

import { prisma } from "@/lib/db";
import { NETWORK_MODES, type NetworkMode, type NetworkPolicy } from "@/lib/time-clock";

export const OFFICE_LAT_KEY = "time_clock_office_lat";
export const OFFICE_LNG_KEY = "time_clock_office_lng";
export const OFFICE_RADIUS_KEY = "time_clock_office_radius_m";
export const ALLOWED_IPS_KEY = "time_clock_allowed_ips";
export const NETWORK_MODE_KEY = "time_clock_network_mode";

/** Radio por defecto: cubre un edificio y su banqueta sin abarcar la cuadra. */
export const DEFAULT_RADIUS_M = 150;

export interface OfficeGeofence {
  lat: number;
  lng: number;
  radiusM: number;
}

export interface TimeClockConfig {
  geofence: OfficeGeofence | null;
  network: NetworkPolicy;
}

function parseIps(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\s]+/)
    .map((ip) => ip.trim())
    .filter(Boolean);
}

export async function loadTimeClockConfig(): Promise<TimeClockConfig> {
  const rows = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          OFFICE_LAT_KEY,
          OFFICE_LNG_KEY,
          OFFICE_RADIUS_KEY,
          ALLOWED_IPS_KEY,
          NETWORK_MODE_KEY,
        ],
      },
    },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));

  const lat = Number(map.get(OFFICE_LAT_KEY));
  const lng = Number(map.get(OFFICE_LNG_KEY));
  const radius = Number(map.get(OFFICE_RADIUS_KEY));

  const rawMode = map.get(NETWORK_MODE_KEY) as NetworkMode | undefined;

  return {
    geofence:
      Number.isFinite(lat) && Number.isFinite(lng)
        ? {
            lat,
            lng,
            radiusM: Number.isFinite(radius) && radius > 0 ? radius : DEFAULT_RADIUS_M,
          }
        : null,
    network: {
      mode: rawMode && NETWORK_MODES.includes(rawMode) ? rawMode : "off",
      allowedIps: parseIps(map.get(ALLOWED_IPS_KEY)),
    },
  };
}
