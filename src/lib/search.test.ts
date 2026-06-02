import { describe, it, expect } from "vitest";
import { normalizeSearch, fuzzyMatch } from "@/lib/search";

describe("normalizeSearch", () => {
  it("quita acentos y pasa a minúsculas", () => {
    expect(normalizeSearch("PÉREZ")).toBe("perez");
    expect(normalizeSearch("Camión")).toBe("camion");
  });
  it("normaliza la ñ a n", () => {
    expect(normalizeSearch("Ñoño")).toBe("nono");
  });
  it("recorta espacios", () => {
    expect(normalizeSearch("  hola  ")).toBe("hola");
  });
});

describe("fuzzyMatch", () => {
  it("encuentra ignorando acentos y mayúsculas", () => {
    expect(fuzzyMatch("José Pérez", "jose perez")).toBe(true);
    expect(fuzzyMatch("Monterrey", "TERR")).toBe(true);
  });
  it("devuelve false cuando no hay coincidencia", () => {
    expect(fuzzyMatch("Guadalajara", "xyz")).toBe(false);
  });
});
