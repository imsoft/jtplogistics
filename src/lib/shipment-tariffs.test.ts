import { describe, expect, it } from "vitest";
import { canManageTariffs, effectiveTariffs, isTariffOnlyBody, parseTariff, readTariffs } from "./shipment-tariffs";
import { shipmentsToExcelAoa } from "./excel-export";
import type { Shipment } from "@/types/shipment.types";

describe("shipment-tariffs", () => {
  it("lee montos con signo y comas", () => {
    expect(parseTariff("$25,000.50")).toBe(25000.5);
    expect(parseTariff(18000)).toBe(18000);
    expect(parseTariff("")).toBeNull();
    expect(parseTariff(undefined)).toBeUndefined();
    expect(parseTariff("abc")).toBe("invalid");
    expect(parseTariff(-5)).toBe("invalid");
  });

  it("readTariffs solo trae lo que viene y reporta errores", () => {
    expect(readTariffs({ eco: "x" })).toEqual({ ok: true, data: {} });
    expect(readTariffs({ sale: "1,000", cost: "" })).toEqual({ ok: true, data: { sale: 1000, cost: null } });
    expect(readTariffs({ sale: "mil" }).ok).toBe(false);
  });

  it("un embarque bloqueado solo acepta tarifas", () => {
    expect(isTariffOnlyBody({ sale: "1", cost: "2", _confirmedEmail: "" })).toBe(true);
    expect(isTariffOnlyBody({ sale: "1", eco: "x" })).toBe(false);
    expect(isTariffOnlyBody({})).toBe(false);
  });

  it("quién ve y captura tarifas", () => {
    expect(canManageTariffs({ role: "admin" })).toBe(true);
    expect(canManageTariffs({ role: "developer" })).toBe(true);
    expect(canManageTariffs({ role: "collaborator" }, { canViewFinances: true })).toBe(true);
    expect(canManageTariffs({ role: "collaborator" }, { canViewFinances: false })).toBe(false);
    expect(canManageTariffs({ role: "carrier" })).toBe(false);
  });

  it("la tarifa del embarque manda; si no hay, la de finanzas", () => {
    expect(effectiveTariffs({ sale: 100, cost: null }, { sale: 50, cost: 40 })).toEqual({ sale: 100, cost: 40 });
    expect(effectiveTariffs({}, null)).toEqual({ sale: null, cost: null });
  });
});

describe("Excel de embarques", () => {
  const base = {
    id: "1", eco: "E1", client: "C", origin: "A", destination: "B", product: null, pickupDate: null, deliveryDate: null,
    legalName: null, operatorName: null, truck: null, trailer: null, unit: null, phone: null, comments: null,
    incident: null, incidentType: null, status: "pending", createdAt: "2026-10-22T00:00:00Z",
  } as Shipment;

  it("sin tarifa en los datos no agrega la columna", () => {
    const aoa = shipmentsToExcelAoa([base], []);
    expect(aoa[0]).not.toContain("Tarifa de venta");
  });

  it("con tarifa agrega la columna al final", () => {
    const aoa = shipmentsToExcelAoa([{ ...base, sale: 28500 }, { ...base, sale: null }], []);
    expect(aoa[0].at(-1)).toBe("Tarifa de venta");
    expect(aoa[1].at(-1)).toBe(28500);
    expect(aoa[2].at(-1)).toBe("");
  });
});
