import { describe, it, expect } from "vitest";
import { carrierAbilities, pickMemberPermissions } from "@/lib/carrier-permissions";

const none = {
  memberCanViewRates: false,
  memberCanEditRates: false,
  memberCanMessage: false,
  memberCanSuggest: false,
  memberCanEditCompany: false,
};

describe("permisos del usuario principal", () => {
  it("lo puede todo, aunque sus columnas de miembro estén apagadas", () => {
    const can = carrierAbilities({ parentCarrierId: null, ...none });
    expect(Object.values(can).every(Boolean)).toBe(true);
  });
});

describe("permisos de un usuario agregado", () => {
  it("sin permisos no puede nada", () => {
    const can = carrierAbilities({ parentCarrierId: "p1", ...none });
    expect(Object.values(can).some(Boolean)).toBe(false);
  });

  it("nunca administra usuarios, aunque tenga todo lo demás", () => {
    const can = carrierAbilities({
      parentCarrierId: "p1",
      memberCanViewRates: true,
      memberCanEditRates: true,
      memberCanMessage: true,
      memberCanSuggest: true,
      memberCanEditCompany: true,
    });
    expect(can.manageUsers).toBe(false);
  });

  it("capturar tarifas incluye verlas", () => {
    const can = carrierAbilities({ parentCarrierId: "p1", ...none, memberCanEditRates: true });
    expect(can.viewRates).toBe(true);
    expect(can.editRates).toBe(true);
  });

  it("ver tarifas no permite capturarlas", () => {
    const can = carrierAbilities({ parentCarrierId: "p1", ...none, memberCanViewRates: true });
    expect(can.viewRates).toBe(true);
    expect(can.editRates).toBe(false);
  });

  it("cada permiso abre solo lo suyo", () => {
    const can = carrierAbilities({ parentCarrierId: "p1", ...none, memberCanMessage: true });
    expect(can).toMatchObject({ message: true, suggest: false, editCompany: false, viewRates: false });
  });
});

describe("lectura de permisos desde un formulario", () => {
  it("ignora campos que no son permisos", () => {
    const out = pickMemberPermissions({ memberCanMessage: true, role: "admin", parentCarrierId: "x" });
    expect(out).toEqual({ memberCanMessage: true });
  });

  it("ignora valores que no son booleanos", () => {
    expect(pickMemberPermissions({ memberCanSuggest: "true" })).toEqual({});
  });
});
