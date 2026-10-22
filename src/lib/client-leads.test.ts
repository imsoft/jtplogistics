import { describe, expect, it } from "vitest";
import { followUpState, isLeadStage, isOpenStage, requiresLostReason } from "./client-leads";

describe("client-leads", () => {
  it("solo perdido pide motivo", () => {
    expect(requiresLostReason("perdido")).toBe(true);
    expect(requiresLostReason("negociacion")).toBe(false);
  });

  it("ganado y perdido cierran el seguimiento", () => {
    expect(isOpenStage("ganado")).toBe(false);
    expect(isOpenStage("perdido")).toBe(false);
    expect(isOpenStage("cotizado")).toBe(true);
  });

  it("valida etapas", () => {
    expect(isLeadStage("contactado")).toBe(true);
    expect(isLeadStage("descartado")).toBe(false);
    expect(isLeadStage(null)).toBe(false);
  });

  it("clasifica el seguimiento contra hoy", () => {
    expect(followUpState("2026-10-20", "2026-10-22", "contactado")).toBe("vencido");
    expect(followUpState("2026-10-22", "2026-10-22", "contactado")).toBe("hoy");
    expect(followUpState("2026-10-25", "2026-10-22", "contactado")).toBe("proximo");
    expect(followUpState(null, "2026-10-22", "contactado")).toBeNull();
  });

  it("un prospecto cerrado no tiene seguimiento pendiente", () => {
    expect(followUpState("2026-10-01", "2026-10-22", "ganado")).toBeNull();
    expect(followUpState("2026-10-01", "2026-10-22", "perdido")).toBeNull();
  });
});
