import { describe, expect, it } from "vitest";
import { isMunicipalityOf, municipalitiesFor } from "./mx-places";
import { MX_STATES, stateLabel } from "./sat-catalogs";

describe("estados y municipios", () => {
  it("los 32 estados tienen sus municipios", () => {
    for (const s of MX_STATES) expect(municipalitiesFor(s.value).length, s.label).toBeGreaterThan(0);
    expect(municipalitiesFor("CMX")).toContain("Iztapalapa");
    expect(municipalitiesFor("jal")).toContain("Acatlán de Juárez");
    expect(municipalitiesFor("XXX")).toEqual([]);
  });

  it("municipio del estado, sin importar acentos", () => {
    expect(isMunicipalityOf("JAL", "acatlan de juarez")).toBe(true);
    expect(isMunicipalityOf("CMX", "Guadalajara")).toBe(false);
  });

  it("estado como el CFDI", () => {
    expect(stateLabel("JAL")).toBe("JAL-Jalisco");
    expect(stateLabel("CMX-D. F.")).toBe("CMX-D. F.");
  });
});
