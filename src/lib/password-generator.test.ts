import { describe, it, expect } from "vitest";
import { generatePassword, MIN_PASSWORD_LENGTH } from "@/lib/password-generator";

describe("contraseña temporal", () => {
  it("se puede dictar por teléfono: sin caracteres que se confundan", () => {
    // Fuera la O y el 0, la I y el 1, la L minúscula.
    const prohibidos = /[O0I1lU]/;
    for (let i = 0; i < 200; i++) {
      expect(generatePassword().slice(4)).not.toMatch(prohibidos);
    }
  });

  it("lleva el prefijo de la empresa", () => {
    expect(generatePassword()).toMatch(/^JTP-[A-Z2-9]{8}$/);
  });

  it("cumple el mínimo que pide Better Auth", () => {
    expect(generatePassword().length).toBeGreaterThanOrEqual(MIN_PASSWORD_LENGTH);
  });

  it("no repite: cada persona recibe la suya", () => {
    const muestras = new Set(Array.from({ length: 500 }, () => generatePassword()));
    expect(muestras.size).toBe(500);
  });
});
