import { describe, it, expect } from "vitest";
import {
  CONTRACT_STATUSES,
  ONBOARDING_DOCS,
  completedOnAfterChange,
  docProgress,
  isDocsComplete,
  onboardingStage,
  validateHold,
  type DocRecord,
} from "@/lib/provider-onboardings";

const all = (status: DocRecord[keyof DocRecord]): DocRecord =>
  Object.fromEntries(ONBOARDING_DOCS.map((d) => [d.key, status])) as DocRecord;

describe("expediente", () => {
  it("son los 8 documentos del Excel, en su orden", () => {
    expect(ONBOARDING_DOCS.map((d) => d.label)).toEqual([
      "Alta JTP",
      "Proceso de facturación",
      "Constancia de situación fiscal",
      "Opinión de cumplimiento",
      "Comprobante de domicilio",
      "INE",
      "Acta constitutiva",
      "Poder notarial",
    ]);
  });

  it("cuenta recibidos y no aplica como resueltos", () => {
    const docs = { ...all("received"), docPower: "not_applicable", docIne: "pending" } as DocRecord;
    expect(docProgress(docs)).toEqual({ done: 7, total: 8, pending: ["docIne"] });
    expect(isDocsComplete(docs)).toBe(false);
    expect(isDocsComplete({ ...docs, docIne: "received" })).toBe(true);
  });
});

describe("estado general", () => {
  it("detenido manda sobre todo", () => {
    expect(onboardingStage({ onHoldSince: "2026-10-01", docs: all("received") })).toBe("on_hold");
  });
  it("completo o en proceso según el expediente", () => {
    expect(onboardingStage({ onHoldSince: null, docs: all("received") })).toBe("complete");
    expect(onboardingStage({ onHoldSince: null, docs: all("pending") })).toBe("in_progress");
  });
});

describe("fecha de alta completa", () => {
  it("se pone sola la primera vez que se completa", () => {
    expect(completedOnAfterChange(all("received"), null, "2026-10-10")).toBe("2026-10-10");
  });
  it("respeta la que Finanzas ya puso", () => {
    expect(completedOnAfterChange(all("received"), "2026-08-01", "2026-10-10")).toBe("2026-08-01");
  });
  it("no se inventa si falta un documento", () => {
    expect(completedOnAfterChange(all("pending"), null, "2026-10-10")).toBeNull();
  });
});

describe("detener", () => {
  it("pide motivo", () => {
    expect(validateHold({ onHold: true, holdReason: " " })).toMatch(/motivo|por qué/);
    expect(validateHold({ onHold: true, holdReason: "Ya no contesta" })).toBeNull();
    expect(validateHold({ onHold: false, holdReason: "" })).toBeNull();
  });
});

describe("contrato", () => {
  it("los estados son los textos que usa Finanzas", () => {
    expect(CONTRACT_STATUSES.map((c) => c.label)).toContain("Enviado al proveedor, pendiente de firma");
    expect(CONTRACT_STATUSES.map((c) => c.label)).toContain("Recibido firmado");
  });
});
