import { describe, it, expect } from "vitest";
import {
  isProspectStatus,
  pipelineStatuses,
  PROSPECT_COVERAGES,
  PROSPECT_SOURCES,
  PROSPECT_STATUS_LABELS,
  PROSPECT_STATUSES,
  requiresDiscardReason,
} from "@/lib/provider-prospects";

describe("etapas de prospección", () => {
  it("van en el orden del embudo", () => {
    expect(PROSPECT_STATUSES.map((s) => s.value)).toEqual([
      "pendiente",
      "prospectando",
      "negociando",
      "en_alta",
      "listo",
      "descartado",
    ]);
  });

  it("usa los nombres que pidió el cliente", () => {
    expect(PROSPECT_STATUS_LABELS.pendiente).toBe("Pendiente de prospectar");
    expect(PROSPECT_STATUS_LABELS.en_alta).toBe("En proceso de alta");
    expect(PROSPECT_STATUS_LABELS.listo).toBe("Listo para operar");
  });

  it("descartado no cuenta como avance del embudo", () => {
    expect(pipelineStatuses()).not.toContain("descartado");
    expect(pipelineStatuses()).toHaveLength(5);
  });
});

describe("motivo al descartar", () => {
  it("se exige solo al descartar", () => {
    expect(requiresDiscardReason("descartado")).toBe(true);
    for (const s of pipelineStatuses()) {
      expect(requiresDiscardReason(s)).toBe(false);
    }
  });
});

describe("cómo se consiguió el contacto", () => {
  it("son las cuatro formas que pidió", () => {
    expect(PROSPECT_SOURCES.map((s) => s.label)).toEqual([
      "Carretera",
      "Grupo de WhatsApp",
      "Internet",
      "Calle",
    ]);
  });
});

describe("cobertura", () => {
  it("son las tres opciones que pidió", () => {
    expect(PROSPECT_COVERAGES.map((c) => c.value)).toEqual([
      "nacional",
      "internacional",
      "ambas",
    ]);
  });
});

describe("validación de etapa", () => {
  it("acepta una etapa real y rechaza cualquier otra cosa", () => {
    expect(isProspectStatus("negociando")).toBe(true);
    expect(isProspectStatus("otra")).toBe(false);
    expect(isProspectStatus(3)).toBe(false);
  });
});
