import { describe, it, expect } from "vitest";
import { ALL, assigneeDepartments, matchesEmailFilters } from "@/lib/email-accounts-list";

const person = (department: string | null) => ({
  user: { employeeProfile: department === null ? null : { department } },
});

describe("assigneeDepartments", () => {
  it("junta los de todas las personas, sin repetir y en orden", () => {
    expect(assigneeDepartments([person("Logística"), person("Finanzas"), person("Logística")])).toEqual([
      "Finanzas",
      "Logística",
    ]);
  });

  it("ignora a quien no tiene departamento", () => {
    expect(assigneeDepartments([person(null), person(""), person("  ")])).toEqual([]);
  });
});

describe("matchesEmailFilters", () => {
  const compartida = { type: "administrative", departments: ["Finanzas", "Logística"] };
  const sinAsignar = { type: "hotmail", departments: [] };

  it("sin filtros pasa todo", () => {
    expect(matchesEmailFilters(compartida, { type: ALL, department: ALL })).toBe(true);
    expect(matchesEmailFilters(sinAsignar, { type: ALL, department: ALL })).toBe(true);
  });

  // La ✕ del selector deja el valor vacío; antes eso vaciaba la tabla.
  it("un filtro vacío cuenta como todos", () => {
    expect(matchesEmailFilters(compartida, { type: "", department: "" })).toBe(true);
  });

  it("filtra por tipo", () => {
    expect(matchesEmailFilters(compartida, { type: "administrative", department: ALL })).toBe(true);
    expect(matchesEmailFilters(sinAsignar, { type: "administrative", department: ALL })).toBe(false);
  });

  // Antes solo contaba el departamento del primer asignado.
  it("una cuenta compartida aparece en cualquiera de sus departamentos", () => {
    expect(matchesEmailFilters(compartida, { type: ALL, department: "Finanzas" })).toBe(true);
    expect(matchesEmailFilters(compartida, { type: ALL, department: "Logística" })).toBe(true);
    expect(matchesEmailFilters(compartida, { type: ALL, department: "Recursos Humanos" })).toBe(false);
  });

  it("una cuenta sin asignar no tiene departamento que coincida", () => {
    expect(matchesEmailFilters(sinAsignar, { type: ALL, department: "Finanzas" })).toBe(false);
  });

  it("combina los dos filtros", () => {
    expect(matchesEmailFilters(compartida, { type: "administrative", department: "Finanzas" })).toBe(true);
    expect(matchesEmailFilters(compartida, { type: "hotmail", department: "Finanzas" })).toBe(false);
  });
});
