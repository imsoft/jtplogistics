import { describe, expect, it } from "vitest";
import { extraCostsError, extrasSum, readExtraCosts, withExtras } from "./shipment-extras";

describe("costos extra del embarque", () => {
  it("limpia lo capturado y descarta renglones vacíos", () => {
    expect(readExtraCosts([{ concept: " Maniobras ", sale: "$1,500", cost: "1000" }, { concept: "", sale: "", cost: "" }, "x"])).toEqual([
      { concept: "Maniobras", sale: 1500, cost: 1000 },
    ]);
    expect(readExtraCosts(null)).toEqual([]);
  });

  it("pide concepto si hay monto", () => {
    expect(extraCostsError(readExtraCosts([{ concept: "", sale: 100 }]))).toMatch(/concepto/);
  });

  it("suma a la tarifa base de cada lado", () => {
    const list = readExtraCosts([{ concept: "Maniobras", sale: 1500, cost: 1000 }, { concept: "Casetas", cost: 350.5 }]);
    expect(extrasSum(list)).toEqual({ sale: 1500, cost: 1350.5 });
    expect(withExtras(20000, 1500)).toBe(21500);
    expect(withExtras(null, 0)).toBeNull();
    expect(withExtras(null, 350)).toBe(350);
  });
});
