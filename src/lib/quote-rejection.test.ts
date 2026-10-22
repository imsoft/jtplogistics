import { describe, expect, it } from "vitest";
import { rejectionUpdate } from "./quote-rejection";

describe("rejectionUpdate", () => {
  it("sin cambio de estado no toca el motivo", () => {
    expect(rejectionUpdate({})).toEqual({ ok: true, data: {} });
  });

  it("al rechazar exige un motivo válido", () => {
    expect(rejectionUpdate({ status: "rechazada" }).ok).toBe(false);
    expect(rejectionUpdate({ status: "rechazada", rejectionReason: "caro" }).ok).toBe(false);
    expect(rejectionUpdate({ status: "rechazada", rejectionReason: "precio" })).toEqual({
      ok: true,
      data: { rejectionReason: "precio", rejectionNote: null },
    });
  });

  it("'otro' pide detalle", () => {
    expect(rejectionUpdate({ status: "rechazada", rejectionReason: "otro", rejectionNote: " " }).ok).toBe(false);
    expect(rejectionUpdate({ status: "rechazada", rejectionReason: "otro", rejectionNote: "Cambió de planta" })).toEqual({
      ok: true,
      data: { rejectionReason: "otro", rejectionNote: "Cambió de planta" },
    });
  });

  it("si deja de estar rechazada, se limpia", () => {
    expect(rejectionUpdate({ status: "negociacion" })).toEqual({
      ok: true,
      data: { rejectionReason: null, rejectionNote: null },
    });
  });
});
