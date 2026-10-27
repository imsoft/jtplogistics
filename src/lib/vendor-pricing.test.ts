import { describe, expect, it } from "vitest";
import { suggestedQuotePrice, vendorCommissionSummary } from "./vendor-pricing";

describe("precios del vendedor", () => {
  it("sugerido: promedio de transportistas, luego target de la ruta", () => {
    expect(suggestedQuotePrice([20000, 30000], 10000)).toBe(32500);
    expect(suggestedQuotePrice([], 10000)).toBe(13000);
    expect(suggestedQuotePrice([], null)).toBeNull();
    expect(suggestedQuotePrice([], 0)).toBeNull();
  });

  it("resumen de comisión con el mismo cálculo de antes", () => {
    expect(vendorCommissionSummary([20000])).toEqual({ venta: 25000, monto: 29000, comision: 870 });
    expect(vendorCommissionSummary([])).toBeNull();
  });
});
