import { describe, expect, it } from "vitest";
import { normalizePayloadToLowercase } from "./text-case";

describe("normalizePayloadToLowercase", () => {
  it("pasa a minúsculas el texto normal", () => {
    expect(normalizePayloadToLowercase({ companyName: "GRUPO BIMBO" })).toEqual({ companyName: "grupo bimbo" });
  });

  it("no toca ids: los de Better Auth traen mayúsculas", () => {
    const ids = { id: "AbC123", ownerId: "XyZ9Q", routeIds: ["Ab", "Cd"] };
    expect(normalizePayloadToLowercase(ids)).toEqual(ids);
  });

  it("no toca contraseñas", () => {
    expect(normalizePayloadToLowercase({ password: "Secreta1" })).toEqual({ password: "Secreta1" });
  });

  it("una llave que solo contiene 'id' en medio sí se normaliza", () => {
    expect(normalizePayloadToLowercase({ idea: "HOLA" })).toEqual({ idea: "hola" });
  });
});
