import { describe, expect, it } from "vitest";
import { providerMargin, readQuoteProvider } from "./quote-providers";

describe("proveedores cotizados", () => {
  it("acepta uno dado de alta o uno escrito a mano, con precio", () => {
    expect(readQuoteProvider({ carrierId: "c1", name: "Transportes Brandon", amount: "15,000" }, 1)).toEqual({
      carrierId: "c1",
      name: "Transportes Brandon",
      amount: 15000,
      routeIndex: null,
    });
    expect(readQuoteProvider({ name: "  Fletes   Luna ", amount: 16200, routeIndex: 1 }, 2)).toEqual({
      carrierId: null,
      name: "Fletes Luna",
      amount: 16200,
      routeIndex: 1,
    });
  });
  it("pide nombre, precio y una ruta que exista", () => {
    expect(readQuoteProvider({ amount: 100 }, 1)).toHaveProperty("error");
    expect(readQuoteProvider({ name: "Luna", amount: 0 }, 1)).toHaveProperty("error");
    expect(readQuoteProvider({ name: "Luna", amount: 100, routeIndex: 3 }, 2)).toHaveProperty("error");
  });
  it("calcula el margen contra el precio al cliente", () => {
    expect(providerMargin(15000, null, [18900])).toEqual({ margin: 3900, pct: 20.6 });
    expect(providerMargin(15000, 1, [10000, 20000])).toEqual({ margin: 5000, pct: 25 });
    expect(providerMargin(15000, null, [10000, 20000])).toBeNull();
  });
});
