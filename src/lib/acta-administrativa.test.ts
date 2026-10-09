import { describe, it, expect } from "vitest";
import {
  actaFilename,
  continuation,
  emptyActa,
  longDate,
  splitDate,
  validateActa,
  yearInWords,
} from "@/lib/acta-administrativa";

describe("yearInWords", () => {
  it("escribe el año como en un acta", () => {
    expect(yearInWords(2026)).toBe("dos mil veintiséis");
    expect(yearInWords(2030)).toBe("dos mil treinta");
    expect(yearInWords(2031)).toBe("dos mil treinta y uno");
    expect(yearInWords(2000)).toBe("dos mil");
    expect(yearInWords(2015)).toBe("dos mil quince");
    expect(yearInWords(2099)).toBe("dos mil noventa y nueve");
  });

  it("no inventa años fuera de rango", () => {
    expect(() => yearInWords(1999)).toThrow();
  });
});

describe("fechas", () => {
  it("no recorre el día por zona horaria", () => {
    expect(splitDate("2026-10-01")).toEqual({ day: 1, month: "octubre", year: 2026 });
    expect(longDate("2026-12-31")).toBe("31 de diciembre de 2026");
  });
});

describe("validateActa", () => {
  const base = () => ({
    ...emptyActa("2026-10-09", "10:30", "Ana Castro"),
    employeeName: "Juan Pérez",
    employeePosition: "Ejecutivo de tráfico",
    incidentDescription: "No dio seguimiento al embarque",
    breach: "dar seguimiento a sus operaciones",
  });

  it("acepta un acta completa", () => {
    expect(validateActa(base())).toEqual({});
  });

  it("pide lo mínimo", () => {
    const e = validateActa(emptyActa("2026-10-09", "10:30"));
    expect(Object.keys(e).sort()).toEqual(
      ["breach", "employeeName", "employeePosition", "incidentDescription", "responsibleName"].sort()
    );
  });

  it("el cierre no puede ser antes que el inicio", () => {
    expect(validateActa({ ...base(), endTime: "10:00" }).endTime).toMatch(/antes/);
    expect(validateActa({ ...base(), endTime: "11:15" }).endTime).toBeUndefined();
  });

  it("los hechos no pueden ser después del acta", () => {
    expect(validateActa({ ...base(), incidentDate: "2026-10-10" }).incidentDate).toMatch(/posteriores/);
  });

  it("el nombre de archivo no lleva acentos ni espacios", () => {
    expect(actaFilename({ ...base(), employeeName: "José Núñez Peña" })).toBe(
      "acta-administrativa-jose-nunez-pena-2026-10-09.pdf"
    );
  });
});

describe("continuation", () => {
  it("sigue la oración del machote sin mayúscula inicial", () => {
    expect(continuation("NO DIO SEGUIMIENTO AL EMBARQUE.")).toBe("no dio seguimiento al embarque");
    expect(continuation("No dio seguimiento")).toBe("no dio seguimiento");
  });

  it("respeta las siglas al inicio", () => {
    expect(continuation("IMSS no recibió el aviso")).toMatch(/^IMSS/);
  });

  it("vacío se queda vacío", () => {
    expect(continuation("   ")).toBe("");
  });
});
