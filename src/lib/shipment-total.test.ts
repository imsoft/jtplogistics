import { describe, expect, it } from "vitest";
import { shipmentTotal } from "./shipment-total";

describe("shipmentTotal", () => {
  it("compra × 12 % + 240", () => {
    expect(shipmentTotal(10000)).toBe(1440);
    expect(shipmentTotal(0)).toBe(240);
  });

  it("redondea a centavos", () => {
    expect(shipmentTotal(1234.56)).toBe(388.15);
  });

  it("sin tarifa de compra no hay total", () => {
    expect(shipmentTotal(null)).toBeNull();
    expect(shipmentTotal(undefined)).toBeNull();
    expect(shipmentTotal(Number.NaN)).toBeNull();
  });
});
