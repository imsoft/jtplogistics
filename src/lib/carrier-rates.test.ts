import { describe, expect, it } from "vitest";
import { readCarrierRates } from "./carrier-rates";

describe("tarifas del transportista", () => {
  const ok = { routeId: "r1", unitType: "caja_seca", carrierTarget: 25000, carrierWeeklyVolume: 3 };
  it("acepta números o texto numérico y deja vacío como null", () => {
    expect(readCarrierRates([ok, { routeId: "r2", unitType: "caja_seca", carrierTarget: "18000.5", carrierWeeklyVolume: "" }], "caja_seca")).toEqual({
      ok: true,
      items: [ok, { routeId: "r2", unitType: "caja_seca", carrierTarget: 18000.5, carrierWeeklyVolume: null }],
    });
  });
  it("rechaza negativos, absurdos, decimales en volumen, repetidos y otro tipo de unidad", () => {
    expect(readCarrierRates([{ ...ok, carrierTarget: -5 }], "caja_seca").ok).toBe(false);
    expect(readCarrierRates([{ ...ok, carrierTarget: 1e12 }], "caja_seca").ok).toBe(false);
    expect(readCarrierRates([{ ...ok, carrierWeeklyVolume: 2.5 }], "caja_seca").ok).toBe(false);
    expect(readCarrierRates([ok, ok], "caja_seca")).toEqual({ ok: false, error: "Una ruta viene repetida." });
    expect(readCarrierRates([ok], "torton").ok).toBe(false);
    expect(readCarrierRates({}, "caja_seca").ok).toBe(false);
  });
});
