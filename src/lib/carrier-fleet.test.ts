import { describe, expect, it } from "vitest";
import { fleetReadiness, operatorMissing, readOperatorBody, readVehicleBody, vehicleMissing, type VehicleData } from "./carrier-fleet";

const fullTractor = {
  kind: "motriz",
  plates: "ab-123-cd",
  year: "2020",
  vehicleConfig: "t3s2",
  sctPermitType: "tpaf01",
  sctPermitNumber: "1234abc",
  grossWeightTons: "36",
  insurer: "Qualitas",
  policyNumber: "p-555",
};

describe("readVehicleBody", () => {
  it("normaliza placas y claves aunque lleguen en minúsculas", () => {
    const r = readVehicleBody(fullTractor, 2026);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.plates).toBe("AB123CD");
      expect(r.data.vehicleConfig).toBe("T3S2");
      expect(r.data.sctPermitType).toBe("TPAF01");
      expect(r.data.year).toBe(2020);
      expect(vehicleMissing(r.data)).toEqual([]);
    }
  });
  it("valida placas, año, claves y peso", () => {
    expect(readVehicleBody({ ...fullTractor, plates: "a1" }, 2026).ok).toBe(false);
    expect(readVehicleBody({ ...fullTractor, year: "2031" }, 2026).ok).toBe(false);
    expect(readVehicleBody({ ...fullTractor, vehicleConfig: "X9" }, 2026).ok).toBe(false);
    expect(readVehicleBody({ ...fullTractor, grossWeightTons: "500" }, 2026).ok).toBe(false);
  });
  it("el remolque solo pide placas y subtipo", () => {
    const r = readVehicleBody({ kind: "remolque", plates: "123XY9", trailerSubtype: "ctr007", vehicleConfig: "T3S2" }, 2026);
    expect(r.ok && r.data.vehicleConfig).toBe(null);
    expect(r.ok && vehicleMissing(r.data)).toEqual([]);
    const r2 = readVehicleBody({ kind: "remolque", plates: "123XY9" }, 2026);
    expect(r2.ok && vehicleMissing(r2.data)).toEqual(["subtipo de remolque"]);
  });
});

describe("operadores y expediente", () => {
  it("valida el RFC del operador", () => {
    expect(readOperatorBody({ name: "Juan Pérez", rfc: "xxx" }).ok).toBe(false);
    const r = readOperatorBody({ name: "Juan Pérez", rfc: "pejj800101ab1", licenseNumber: "jal123" });
    expect(r.ok && r.data.rfc).toBe("PEJJ800101AB1");
    expect(r.ok && operatorMissing(r.data)).toEqual([]);
  });
  it("listo cuando hay una motriz completa y un operador completo", () => {
    const t = readVehicleBody(fullTractor, 2026);
    const o = readOperatorBody({ name: "Juan Pérez", rfc: "PEJJ800101AB1", licenseNumber: "JAL123" });
    if (!t.ok || !o.ok) throw new Error("datos de prueba");
    expect(fleetReadiness([t.data], [o.data])).toEqual({ ready: true, missing: [] });
    expect(fleetReadiness([{ ...t.data, insurer: null } as VehicleData], [o.data]).ready).toBe(false);
    expect(fleetReadiness([t.data], [{ ...o.data, active: false }]).missing).toEqual(["un operador con RFC y licencia"]);
  });
});
