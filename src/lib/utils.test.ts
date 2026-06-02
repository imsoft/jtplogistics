import { describe, it, expect } from "vitest";
import { formatPhone, formatIMEI, formatMxn, parseMxn, formatMxnLive } from "@/lib/utils";

describe("formatPhone", () => {
  it("formatea 10 dígitos", () => {
    expect(formatPhone("3334109866")).toBe("33 3410 9866");
  });
  it("formatea 12 dígitos con lada 52", () => {
    expect(formatPhone("523334109866")).toBe("+52 33 3410 9866");
  });
  it("ignora caracteres no numéricos antes de formatear", () => {
    expect(formatPhone("(33) 3410-9866")).toBe("33 3410 9866");
  });
  it("devuelve el valor original si no encaja en ningún formato", () => {
    expect(formatPhone("12345")).toBe("12345");
  });
  it("devuelve cadena vacía para null/undefined/vacío", () => {
    expect(formatPhone(null)).toBe("");
    expect(formatPhone(undefined)).toBe("");
    expect(formatPhone("")).toBe("");
  });
});

describe("formatIMEI", () => {
  it("formatea 15 dígitos en bloques", () => {
    expect(formatIMEI("350949811372576")).toBe("35 094981 137257 6");
  });
  it("devuelve el original si no son 15 dígitos", () => {
    expect(formatIMEI("123")).toBe("123");
  });
});

describe("formatMxn", () => {
  it("agrega comas de miles y dos decimales", () => {
    expect(formatMxn(1234.5)).toBe("1,234.50");
    expect(formatMxn(1000000)).toBe("1,000,000.00");
    expect(formatMxn(0)).toBe("0.00");
  });
  it("maneja negativos con coma de miles", () => {
    expect(formatMxn(-1500)).toBe("-1,500.00");
  });
  it("devuelve vacío para NaN", () => {
    expect(formatMxn(Number.NaN)).toBe("");
  });
});

describe("parseMxn", () => {
  it("quita comas y parsea a número", () => {
    expect(parseMxn("1,234.56")).toBe(1234.56);
    expect(parseMxn("  1000 ")).toBe(1000);
  });
  it("devuelve undefined para vacío o inválido", () => {
    expect(parseMxn("")).toBeUndefined();
    expect(parseMxn("   ")).toBeUndefined();
    expect(parseMxn("abc")).toBeUndefined();
  });
});

describe("formatMxnLive", () => {
  it("agrega comas mientras se escribe", () => {
    expect(formatMxnLive("1500")).toBe("1,500");
  });
  it("preserva el punto decimal en progreso", () => {
    expect(formatMxnLive("1500.")).toBe("1,500.");
    expect(formatMxnLive("1500.5")).toBe("1,500.5");
  });
  it("limita a dos decimales", () => {
    expect(formatMxnLive("1500.567")).toBe("1,500.56");
  });
  it("maneja un punto inicial", () => {
    expect(formatMxnLive(".")).toBe(".");
    expect(formatMxnLive(".5")).toBe("0.5");
  });
});
