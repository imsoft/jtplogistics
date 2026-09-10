/**
 * Lectura de ubicación para el checador.
 *
 * Nunca hace fallar la checada: si el colaborador no da permiso, si el GPS no
 * responde o si el navegador no lo soporta, devuelve el motivo y la marca se
 * registra igual. Bloquear aquí significaría que alguien no pueda registrar su
 * entrada el día que falle el GPS, y eso cuesta más de lo que protege.
 */

export type GeoStatus = "granted" | "denied" | "unavailable";

export interface GeoReading {
  status: GeoStatus;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

/** Más de esto y no vale la pena hacer esperar a alguien frente al reloj. */
const TIMEOUT_MS = 8000;

export function readLocation(): Promise<GeoReading> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve({ status: "unavailable" });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          status: "granted",
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) =>
        resolve({
          status: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable",
        }),
      { enableHighAccuracy: true, timeout: TIMEOUT_MS, maximumAge: 0 }
    );
  });
}
