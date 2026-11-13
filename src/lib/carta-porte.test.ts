import { describe, expect, it } from "vitest";
import {
  cartaPorteForDb,
  cartaPorteMissing,
  cartaPorteSummary,
  cartaPorteTotals,
  cleanNumber,
  emptyCartaPorte,
  isCartaPorteEmpty,
  readCartaPorte,
} from "./carta-porte";

describe("carta porte del embarque", () => {
  it("vacía no se guarda", () => {
    expect(isCartaPorteEmpty(emptyCartaPorte())).toBe(true);
    expect(cartaPorteForDb(emptyCartaPorte())).toBeNull();
    expect(cartaPorteForDb(null)).toBeNull();
    expect(cartaPorteForDb("basura")).toBeNull();
  });

  it("limpia claves, números y descarta mercancías vacías", () => {
    const cp = cartaPorteForDb({
      origin: { rfc: " gomm820216222 ", name: " Maribel ", postalCode: "09 300", extra: "x" },
      goods: [
        { satKey: "24122002", description: "Botella de plástico", quantity: "42", unitKey: "h87", weightKg: "21,000.000" },
        { satKey: "", description: "" },
      ],
      inverseLogistics: true,
      transport: { plates: "02 az1a", grossVehicleWeight: "36.00 t" },
    })!;
    expect(cp.origin.rfc).toBe("GOMM820216222");
    expect(cp.origin.name).toBe("Maribel");
    expect(cp.origin.postalCode).toBe("09300");
    expect(cp.origin.country).toBe("MEX");
    expect(cp.goods).toHaveLength(1);
    expect(cp.goods[0].unitKey).toBe("H87");
    expect(cp.goods[0].weightKg).toBe("21000.000");
    expect(cp.inverseLogistics).toBe(true);
    expect(cp.transport.plates).toBe("02-AZ-1A");
    expect(cp.transport.grossVehicleWeight).toBe("36.00");
  });

  it("al leer siempre deja al menos un renglón de mercancía", () => {
    expect(readCartaPorte({}).goods).toHaveLength(1);
  });

  it("suma el peso bruto y cuenta las mercancías", () => {
    const cp = readCartaPorte({ goods: [{ description: "A", weightKg: "1000.5" }, { description: "B", weightKg: "20000" }, {}] });
    expect(cartaPorteTotals(cp)).toEqual({ grossWeightKg: 21000.5, count: 2 });
  });

  it("dice lo que falta", () => {
    const missing = cartaPorteMissing(emptyCartaPorte());
    expect(missing[0]).toMatch(/^origen: RFC/);
    expect(missing).toContain("al menos una mercancía");
    expect(missing.some((m) => m.startsWith("autotransporte"))).toBe(true);
  });

  it("números limpios", () => {
    expect(cleanNumber("$1,250.50")).toBe("1250.50");
    expect(cleanNumber("1.2.3")).toBe("1.23");
    expect(cleanNumber("abc")).toBe("");
  });

  it("resumen para la bitácora", () => {
    expect(cartaPorteSummary(null)).toBeNull();
    expect(cartaPorteSummary(readCartaPorte({ origin: { rfc: "AAA010101AAA" }, goods: [{ description: "x", weightKg: "10" }] }))).toBe(
      "origen AAA010101AAA · 1 mercancía · 10 kg"
    );
  });
});
