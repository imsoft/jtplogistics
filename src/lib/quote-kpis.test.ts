import { describe, expect, it } from "vitest";
import { computeQuoteKpis, kpiDisplayStatus, monthKey, monthRange, normalizeKey, type KpiQuote } from "./quote-kpis";

const NOW = new Date("2026-10-22T18:00:00Z");

function q(partial: Partial<KpiQuote>): KpiQuote {
  return {
    kind: "terrestre",
    status: "enviada",
    validUntil: new Date("2026-12-31T00:00:00Z"),
    createdAt: new Date("2026-10-10T18:00:00Z"),
    createdById: "u1",
    createdByName: "Victor",
    company: "Grupo Bimbo",
    rows: [{ origin: "Guadalajara", destination: "Monterrey", unitLabel: "Caja seca", cost: 20000 }],
    rejectionReason: null,
    ...partial,
  };
}

describe("quote-kpis helpers", () => {
  it("monthKey usa la zona de la empresa", () => {
    // 1 de noviembre a las 02:00 UTC sigue siendo 31 de octubre en CDMX.
    expect(monthKey(new Date("2026-11-01T02:00:00Z"))).toBe("2026-10");
  });

  it("monthRange cruza de año", () => {
    expect(monthRange("2026-11", "2027-02")).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
  });

  it("normalizeKey ignora acentos, mayúsculas y espacios", () => {
    expect(normalizeKey("  Grupo  BIMBÓ ")).toBe("grupo bimbo");
  });
});

describe("computeQuoteKpis", () => {
  it("los borradores no cuentan como emitidas", () => {
    const k = computeQuoteKpis([q({ status: "borrador" }), q({})], NOW, ["2026-10"]);
    expect(k.totals.emitted).toBe(1);
    expect(k.totals.drafts).toBe(1);
  });

  it("tasa de cierre y montos", () => {
    const k = computeQuoteKpis(
      [
        q({ status: "aceptada" }),
        q({ status: "rechazada", rejectionReason: "precio" }),
        q({ status: "enviada", rows: [{ origin: "A", destination: "B", unitLabel: "Full", cost: 10000 }] }),
        q({ status: "enviada", validUntil: new Date("2026-10-01T00:00:00Z") }),
      ],
      NOW,
      ["2026-10"]
    );
    expect(k.totals.emitted).toBe(4);
    expect(k.totals.accepted).toBe(1);
    expect(k.totals.expired).toBe(1);
    expect(k.totals.open).toBe(1);
    expect(k.totals.closeRate).toBeCloseTo(0.25);
    expect(k.totals.quotedAmount).toBe(70000);
    expect(k.totals.wonAmount).toBe(20000);
    expect(k.totals.avgTicket).toBe(17500);
    expect(k.rejectionReasons).toEqual([{ reason: "precio", count: 1 }]);
  });

  it("las marítimas cuentan en el embudo pero no en montos", () => {
    const k = computeQuoteKpis([q({ kind: "maritima", status: "aceptada", rows: [] })], NOW, ["2026-10"]);
    expect(k.totals.accepted).toBe(1);
    expect(k.totals.quotedAmount).toBe(0);
    expect(k.totals.avgTicket).toBe(0);
  });

  it("agrupa clientes escritos distinto y rutas iguales", () => {
    const k = computeQuoteKpis(
      [q({ company: "GRUPO BIMBO" }), q({ company: "grupo bimbó ", status: "aceptada" })],
      NOW,
      ["2026-10"]
    );
    expect(k.byClient).toHaveLength(1);
    expect(k.byClient[0].emitted).toBe(2);
    expect(k.byClient[0].accepted).toBe(1);
    expect(k.byRoute).toHaveLength(1);
    expect(k.byRoute[0]).toMatchObject({ timesQuoted: 2, timesWon: 1, avgCost: 20000 });
  });

  it("desglosa por colaborador y por mes", () => {
    const k = computeQuoteKpis(
      [
        q({ createdById: "u1", createdByName: "Victor", status: "aceptada" }),
        q({ createdById: "u2", createdByName: "Gloria" }),
        q({ createdById: "u1", createdByName: "Victor", createdAt: new Date("2026-09-15T18:00:00Z") }),
      ],
      NOW,
      ["2026-09", "2026-10"]
    );
    expect(k.byUser[0]).toMatchObject({ name: "Victor", emitted: 2, accepted: 1, closeRate: 0.5 });
    expect(k.monthly).toEqual([
      { month: "2026-09", emitted: 1, accepted: 0, quotedAmount: 20000, wonAmount: 0 },
      { month: "2026-10", emitted: 2, accepted: 1, quotedAmount: 40000, wonAmount: 20000 },
    ]);
  });
});

describe("vigencia de la cotización (fecha de calendario en México)", () => {
  it("el día de vigencia todavía no está vencida, ni de noche", () => {
    const q = { status: "enviada" as const, validUntil: new Date("2026-10-26T00:00:00.000Z") };
    // 26 oct, 20:00 en Guadalajara = 27 oct 02:00 UTC
    expect(kpiDisplayStatus(q, new Date("2026-10-27T02:00:00Z"))).toBe("enviada");
    // 27 oct, 06:30 en Guadalajara
    expect(kpiDisplayStatus(q, new Date("2026-10-27T12:30:00Z"))).toBe("vencida");
  });
});
