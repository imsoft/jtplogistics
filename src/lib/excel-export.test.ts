import { describe, it, expect } from "vitest";
import { financesToExcelAoa, excelExportFilename } from "@/lib/excel-export";
import type { FinanceListRow } from "@/types/finance.types";

function row(overrides: Partial<FinanceListRow> = {}): FinanceListRow {
  return {
    status: "delivered",
    eco: "ECO-1",
    client: "Cliente Demo",
    origin: "CDMX",
    destination: "Monterrey",
    sale: 15000,
    cost: 11000,
    operatorName: "José Pérez",
    pickupDate: "2026-07-01",
    deliveryDate: "2026-07-03",
    ...overrides,
  } as unknown as FinanceListRow;
}

describe("financesToExcelAoa", () => {
  it("pone los encabezados en la primera fila", () => {
    const aoa = financesToExcelAoa([row()]);
    expect(aoa[0].slice(0, 5)).toEqual(["Estado", "ECO", "Cliente", "Origen", "Destino"]);
  });

  it("no recorre las fechas por zona horaria", () => {
    // Con formato en hora local, "2026-07-01" salía como "30 jun 2026".
    const aoa = financesToExcelAoa([row()]);
    const [, data] = aoa;
    expect(String(data[8])).toContain("1");
    expect(String(data[8])).toContain("jul");
    expect(String(data[9])).toContain("3");
  });

  it("traduce el estado a español", () => {
    expect(financesToExcelAoa([row()])[1][0]).toBe("Entregado");
  });

  it("deja vacías las fechas ausentes", () => {
    const aoa = financesToExcelAoa([row({ pickupDate: null, deliveryDate: null })]);
    expect(aoa[1][8]).toBe("");
    expect(aoa[1][9]).toBe("");
  });
});

describe("excelExportFilename", () => {
  it("agrega la fecha y la extensión", () => {
    expect(excelExportFilename("finanzas")).toMatch(/^finanzas-\d{4}-\d{2}-\d{2}\.xlsx$/);
  });
});
