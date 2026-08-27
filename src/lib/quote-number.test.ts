import { describe, it, expect } from "vitest";
import { nextSuffix, quoteNumberPrefix } from "@/lib/quote-number";

describe("nextSuffix", () => {
  it("arranca en 1 cuando no hay cotizaciones", () => {
    expect(nextSuffix([])).toBe(1);
  });

  it("no se reinicia al cambiar de día", () => {
    expect(nextSuffix(["JTP-24082026-001", "JTP-24082026-002", "JTP-26082026-003"])).toBe(4);
  });

  it("toma el mayor, no la cantidad: borrar una no repite número", () => {
    // Se emitieron 001, 002 y 003 y se borró la 002: quedan dos, pero el
    // siguiente es 004, no 003.
    expect(nextSuffix(["JTP-24082026-001", "JTP-24082026-003"])).toBe(4);
  });

  it("ignora números con formato inesperado", () => {
    expect(nextSuffix(["JTP-24082026-002", "COTIZACION-VIEJA", "JTP-24082026-abc"])).toBe(3);
  });

  it("pasa de tres dígitos sin problema", () => {
    expect(nextSuffix(["JTP-24082026-999"])).toBe(1000);
  });
});

describe("quoteNumberPrefix", () => {
  it("usa la fecha de México, no la del servidor", () => {
    // 06:00 UTC del 27 son las 00:00 del 27 en Ciudad de México (UTC-6).
    expect(quoteNumberPrefix(new Date("2026-08-27T06:00:00Z"))).toBe("JTP-27082026-");
    // 05:00 UTC del 27 siguen siendo las 23:00 del 26.
    expect(quoteNumberPrefix(new Date("2026-08-27T05:00:00Z"))).toBe("JTP-26082026-");
  });
});
