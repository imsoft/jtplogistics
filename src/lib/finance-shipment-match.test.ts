import { describe, it, expect } from "vitest";
import type { Finance, Shipment } from "@prisma/client";
import { financeMatchesShipment, findFinanceForShipment } from "@/lib/finance-shipment-match";

function shipment(over: Partial<Shipment> = {}): Shipment {
  return {
    eco: "ECO1",
    client: "ACME",
    origin: "GDL",
    destination: "MTY",
    pickupDate: null,
    deliveryDate: null,
    ...over,
  } as unknown as Shipment;
}

function finance(over: Partial<Finance> = {}): Finance {
  return {
    id: "f1",
    eco: "ECO1",
    client: "ACME",
    origin: "GDL",
    destination: "MTY",
    pickupDate: null,
    deliveryDate: null,
    sale: 100,
    cost: 80,
    ...over,
  } as unknown as Finance;
}

describe("financeMatchesShipment", () => {
  it("coincide por eco/cliente/origen/destino cuando el embarque no tiene fechas", () => {
    expect(financeMatchesShipment(finance(), shipment())).toBe(true);
  });
  it("no coincide si difiere un campo core", () => {
    expect(financeMatchesShipment(finance({ eco: "OTRO" }), shipment())).toBe(false);
    expect(financeMatchesShipment(finance({ destination: "QRO" }), shipment())).toBe(false);
  });
  it("exige misma fecha de recolección cuando el embarque la tiene", () => {
    const date = new Date("2026-01-15T00:00:00.000Z");
    expect(financeMatchesShipment(finance({ pickupDate: date }), shipment({ pickupDate: date }))).toBe(true);
    expect(financeMatchesShipment(finance({ pickupDate: null }), shipment({ pickupDate: date }))).toBe(false);
    expect(
      financeMatchesShipment(
        finance({ pickupDate: new Date("2026-02-01T00:00:00.000Z") }),
        shipment({ pickupDate: date })
      )
    ).toBe(false);
  });
  it("ignora la fecha de entrega si el embarque no la tiene", () => {
    expect(
      financeMatchesShipment(finance({ deliveryDate: new Date() }), shipment({ deliveryDate: null }))
    ).toBe(true);
  });
});

describe("findFinanceForShipment", () => {
  it("devuelve la primera finanza que coincide (más reciente primero)", () => {
    const recent = finance({ id: "recent", sale: 200 });
    const old = finance({ id: "old", sale: 150 });
    expect(findFinanceForShipment(shipment(), [recent, old])?.id).toBe("recent");
  });
  it("devuelve null cuando no hay coincidencia", () => {
    expect(findFinanceForShipment(shipment({ eco: "NADA" }), [finance()])).toBeNull();
  });
});
