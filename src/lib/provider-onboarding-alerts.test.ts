import { describe, expect, it } from "vitest";
import { onboardingAlertHref, onboardingAlertText } from "./provider-onboarding-alerts";

describe("avisos de alta de proveedores", () => {
  it("prospecto listo: dice quién lo movió y a qué etapa", () => {
    const t = onboardingAlertText({ kind: "prospect_ready", prospectId: "p1", name: "Toshiro", status: "en_alta" }, "Víctor");
    expect(t.title).toBe("Toshiro: listo para abrir su alta");
    expect(t.body).toContain('Víctor lo pasó a "En proceso de alta"');
  });

  it("contrato: lleva la etapa nueva en el asunto", () => {
    const t = onboardingAlertText({ kind: "contract", onboardingId: "o1", name: "Palco", contractLabel: "Recibido firmado" }, "Liz");
    expect(t.subject).toBe("Contrato de Palco: Recibido firmado");
  });

  it("el enlace va al panel de cada quien", () => {
    expect(onboardingAlertHref("collaborator", { kind: "created", onboardingId: "o1", name: "X" })).toBe("/collaborator/dashboard/provider-onboardings/o1/edit");
    expect(onboardingAlertHref("admin", { kind: "prospect_ready", prospectId: "p", name: "X", status: "listo" })).toBe("/admin/dashboard/provider-onboardings");
  });
});
