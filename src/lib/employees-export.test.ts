import { describe, it, expect } from "vitest";
import { EMPLOYEE_EXPORT_COLUMNS, employeesToExcelAoa } from "@/lib/excel-export";
import { formatPhone } from "@/lib/utils";
import type { Employee } from "@/types/resources.types";

function emp(overrides: Partial<Employee> = {}): Employee {
  return {
    id: "e1",
    name: "Mario Barajas",
    email: "trafico2@jtp.com.mx",
    phone: "3316988299",
    birthDate: "1990-10-04",
    hireDate: "2025-06-09",
    position: "Monitoreo vespertino",
    department: "Logística",
    nss: "12130001",
    rfc: "BASM001004FMA",
    curp: "BASM001004HJCRRRA1",
    address: "Zapopan",
    ...overrides,
  } as Employee;
}

const ALL = new Set(EMPLOYEE_EXPORT_COLUMNS.map((c) => c.key));
const NOW = new Date(2026, 8, 11); // 11 de septiembre de 2026

describe("Excel de colaboradores", () => {
  it("pone los encabezados en el orden de las columnas", () => {
    const [headers] = employeesToExcelAoa([emp()], ALL, NOW);
    expect(headers).toEqual(EMPLOYEE_EXPORT_COLUMNS.map((c) => c.label));
  });

  it("solo incluye las columnas elegidas", () => {
    const aoa = employeesToExcelAoa([emp()], new Set(["name", "phone"]), NOW);
    expect(aoa[0]).toEqual(["Nombre", "Teléfono"]);
    expect(aoa[1]).toHaveLength(2);
  });

  it("el teléfono sale con el mismo formato que en la tabla", () => {
    const [, row] = employeesToExcelAoa([emp()], new Set(["phone"]), NOW);
    expect(row[0]).toBe(formatPhone("3316988299"));
  });

  it("no recorre las fechas por zona horaria", () => {
    const [, row] = employeesToExcelAoa([emp()], new Set(["birthDate"]), NOW);
    expect(String(row[0])).toContain("4");
    expect(String(row[0])).toContain("octubre");
    expect(String(row[0])).toContain("1990");
  });

  it("calcula la antigüedad", () => {
    const [, row] = employeesToExcelAoa([emp()], new Set(["tenure"]), NOW);
    expect(row[0]).toBe("1 año, 3 meses");
  });

  it("deja en blanco lo que no está capturado", () => {
    const [, row] = employeesToExcelAoa(
      [emp({ phone: null, birthDate: null, nss: null })],
      new Set(["phone", "age", "nss"]),
      NOW
    );
    expect(row).toEqual(["", "", ""]);
  });

  it("una fila por colaborador, en el orden recibido", () => {
    const aoa = employeesToExcelAoa(
      [emp({ name: "Brenda" }), emp({ name: "Alejandra" })],
      new Set(["name"]),
      NOW
    );
    expect(aoa.slice(1).map((r) => r[0])).toEqual(["Brenda", "Alejandra"]);
  });
});
