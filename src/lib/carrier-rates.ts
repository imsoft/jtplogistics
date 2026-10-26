/**
 * Lo que manda el transportista al guardar sus rutas de un tipo de unidad:
 * se valida antes de tocar la base de datos para responder 400 con un mensaje
 * claro en lugar de un error del servidor.
 *
 * Puro, para poder probarlo.
 */

export interface CarrierRateInput {
  routeId: string;
  unitType: string;
  carrierTarget: number | null;
  carrierWeeklyVolume: number | null;
}

/** Tope razonable para una tarifa de flete en pesos: arriba de esto es un error de captura. */
export const MAX_CARRIER_TARGET = 5_000_000;
export const MAX_WEEKLY_VOLUME = 10_000;

export function readCarrierRates(body: unknown, pageUnitType: string):
  | { ok: true; items: CarrierRateInput[] }
  | { ok: false; error: string } {
  if (!Array.isArray(body)) return { ok: false, error: "El cuerpo debe ser un arreglo." };
  if (body.length > 2000) return { ok: false, error: "Demasiadas rutas en una sola petición." };
  const items: CarrierRateInput[] = [];
  const seen = new Set<string>();
  for (const raw of body) {
    const r = (raw ?? {}) as Record<string, unknown>;
    const routeId = typeof r.routeId === "string" ? r.routeId : "";
    const unitType = typeof r.unitType === "string" ? r.unitType : "";
    if (!routeId || !unitType) return { ok: false, error: "Cada ruta debe traer su id y tipo de unidad." };
    if (unitType !== pageUnitType) return { ok: false, error: "Todas las rutas deben ser del mismo tipo de unidad." };
    const key = `${routeId}:${unitType}`;
    if (seen.has(key)) return { ok: false, error: "Una ruta viene repetida." };
    seen.add(key);

    let carrierTarget: number | null = null;
    if (r.carrierTarget !== null && r.carrierTarget !== undefined && r.carrierTarget !== "") {
      const n = Number(r.carrierTarget);
      if (!Number.isFinite(n) || n <= 0 || n > MAX_CARRIER_TARGET) {
        return { ok: false, error: "La tarifa debe ser un monto mayor a cero." };
      }
      carrierTarget = Math.round(n * 100) / 100;
    }
    let carrierWeeklyVolume: number | null = null;
    if (r.carrierWeeklyVolume !== null && r.carrierWeeklyVolume !== undefined && r.carrierWeeklyVolume !== "") {
      const n = Number(r.carrierWeeklyVolume);
      if (!Number.isInteger(n) || n < 0 || n > MAX_WEEKLY_VOLUME) {
        return { ok: false, error: "El volumen debe ser un número entero de viajes." };
      }
      carrierWeeklyVolume = n;
    }
    items.push({ routeId, unitType, carrierTarget, carrierWeeklyVolume });
  }
  return { ok: true, items };
}
