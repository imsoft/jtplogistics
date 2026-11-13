import { describe, expect, it } from "vitest";
import { searchTerms, fuzzyMatch } from "./search";
import { formatPhone, formatPhoneLive, formatPlates, formatPlatesLive, platesForSat } from "./phone-plates";

describe("teléfonos con guiones", () => {
  it("10 dígitos → 2-4-4", () => {
    expect(formatPhone("3334109866")).toBe("33-3410-9866");
    expect(formatPhone("33 3410 9866")).toBe("33-3410-9866");
    expect(formatPhone("(33) 3410-9866")).toBe("33-3410-9866");
  });

  it("con lada de México", () => {
    expect(formatPhone("+52 33 3410 9866")).toBe("+52-33-3410-9866");
    expect(formatPhone("523334109866")).toBe("+52-33-3410-9866");
    expect(formatPhone("5213334109866")).toBe("+52-33-3410-9866");
  });

  it("lo que no es un número de 10 dígitos se deja", () => {
    expect(formatPhone("33 3410 9866 ext 12")).toBe("33 3410 9866 ext 12");
    expect(formatPhone("12345")).toBe("12345");
    expect(formatPhone("+1 415 555 0100")).toBe("+1 415 555 0100");
    expect(formatPhone(null)).toBe("");
  });

  it("mientras se escribe", () => {
    expect(formatPhoneLive("33")).toBe("33");
    expect(formatPhoneLive("333")).toBe("33-3");
    expect(formatPhoneLive("333410")).toBe("33-3410");
    expect(formatPhoneLive("3334109")).toBe("33-3410-9");
    expect(formatPhoneLive("33-3410-98666")).toBe("33-3410-98666");
    expect(formatPhoneLive("+5233")).toBe("+52-33");
    expect(formatPhoneLive("ext")).toBe("ext");
    expect(formatPhoneLive("")).toBe("");
  });
});

describe("placas con guiones", () => {
  it("pares de 2; si sobra uno, se une al último", () => {
    expect(formatPlates("02AZ1A")).toBe("02-AZ-1A");
    expect(formatPlates("02 az-1a")).toBe("02-AZ-1A");
    expect(formatPlates("JKL1234")).toBe("JK-L1-234");
    expect(formatPlates("ABCDE")).toBe("AB-CDE");
    expect(formatPlates("ABCD1234")).toBe("AB-CD-12-34");
    expect(formatPlates("ABC")).toBe("ABC");
    expect(formatPlates("")).toBe("");
  });

  it("mientras se escribe", () => {
    expect(formatPlatesLive("02a")).toBe("02-A");
    expect(formatPlatesLive("02AZ1")).toBe("02-AZ-1");
  });

  it("para el SAT, sin guiones", () => {
    expect(platesForSat("02-AZ-1A")).toBe("02AZ1A");
  });
});

describe("búsqueda con guiones", () => {
  it("encuentra teléfonos y placas escritos sin guiones", () => {
    expect(searchTerms("3334109866")).toContain("33-3410-9866");
    expect(searchTerms("02az1a")).toContain("02-AZ-1A");
    expect(searchTerms("transportes")).toEqual(["transportes"]);
    expect(fuzzyMatch("33-3410-9866", "3334109866")).toBe(true);
    expect(fuzzyMatch("02-AZ-1A", "02az")).toBe(true);
    expect(fuzzyMatch("Transportes", "garcia")).toBe(false);
  });
});
