import { describe, it, expect } from "vitest";
import { parseClientProductTypes } from "@/lib/parse-client-product-types";

describe("parseClientProductTypes", () => {
  it("devuelve [] para null/undefined", () => {
    expect(parseClientProductTypes(null)).toEqual([]);
    expect(parseClientProductTypes(undefined)).toEqual([]);
  });
  it("devuelve [] cuando no es arreglo", () => {
    expect(parseClientProductTypes("texto")).toEqual([]);
    expect(parseClientProductTypes(123)).toEqual([]);
  });
  it("recorta, elimina vacíos y deduplica", () => {
    expect(parseClientProductTypes(["a", " a ", "", "b"])).toEqual(["a", "b"]);
  });
  it("convierte valores no-string a string", () => {
    expect(parseClientProductTypes([1, 2, 2])).toEqual(["1", "2"]);
  });
});
