import { describe, it, expect } from "vitest";
import { canOffboard, offboardJson, validateOffboard } from "@/lib/offboarding";

const ctx = { today: "2026-10-09", targetId: "u1", actorId: "rh", alreadyOffboarded: false };
const ok = { date: "2026-10-08", reason: "Renuncia voluntaria" };

describe("quién puede dar de baja", () => {
  it("dirección y soporte siempre", () => {
    expect(canOffboard({ role: "admin" })).toBe(true);
    expect(canOffboard({ role: "developer" })).toBe(true);
  });

  it("RH solo con el permiso de eliminar colaboradores", () => {
    expect(canOffboard({ role: "collaborator", canDeleteEmployees: true })).toBe(true);
    expect(canOffboard({ role: "collaborator", canDeleteEmployees: false })).toBe(false);
  });

  it("nadie de fuera, aunque traiga el permiso prendido", () => {
    expect(canOffboard({ role: "carrier", canDeleteEmployees: true })).toBe(false);
    expect(canOffboard({ role: "vendor", canDeleteEmployees: true })).toBe(false);
  });
});

describe("validateOffboard", () => {
  it("acepta una baja con fecha y motivo", () => {
    expect(validateOffboard(ok, ctx)).toBeNull();
    expect(validateOffboard({ ...ok, date: ctx.today }, ctx)).toBeNull();
  });

  it("exige fecha y motivo", () => {
    expect(validateOffboard({ ...ok, date: "" }, ctx)).toMatch(/fecha/);
    expect(validateOffboard({ ...ok, reason: "  " }, ctx)).toMatch(/motivo/);
  });

  it("no acepta fecha futura", () => {
    expect(validateOffboard({ ...ok, date: "2026-10-10" }, ctx)).toMatch(/futura/);
  });

  it("nadie se da de baja a sí mismo", () => {
    expect(validateOffboard(ok, { ...ctx, actorId: "u1" })).toMatch(/ti mismo/);
  });

  it("no se da de baja dos veces", () => {
    expect(validateOffboard(ok, { ...ctx, alreadyOffboarded: true })).toMatch(/ya está/);
  });
});

describe("offboardJson", () => {
  it("la fecha no se recorre de día", () => {
    expect(offboardJson({ offboardedOn: new Date("2026-10-08T00:00:00.000Z") }).offboardedOn).toBe("2026-10-08");
  });

  it("sin baja, todo en null", () => {
    expect(offboardJson({})).toEqual({ offboardedOn: null, offboardReason: null, offboardedByName: null });
  });
});
