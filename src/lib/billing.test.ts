import { describe, expect, it } from "vitest";
import { agingBucket, bankAmountFor, computeTotals, daysOverdue, documentStatus, paymentError, planBatchPayment, toMxn } from "./billing";

describe("computeTotals", () => {
  it("IVA 16 % y retención 4 % de autotransporte", () => {
    expect(computeTotals({ subtotal: 25000, ivaRate: 0.16, withholdingRate: 0.04 })).toEqual({
      subtotal: 25000,
      iva: 4000,
      ivaWithheld: 1000,
      total: 28000,
    });
  });

  it("redondea a centavos", () => {
    expect(computeTotals({ subtotal: 1234.567, ivaRate: 0.16, withholdingRate: 0 }).total).toBe(1432.10);
  });
});

describe("documentStatus", () => {
  const base = { total: 1000, paid: 0, dueDate: "2026-11-10", cancelled: false, todayKey: "2026-10-26" };
  it("pendiente, parcial, pagada", () => {
    expect(documentStatus(base)).toEqual({ status: "pendiente", balance: 1000 });
    expect(documentStatus({ ...base, paid: 400 })).toEqual({ status: "parcial", balance: 600 });
    expect(documentStatus({ ...base, paid: 999.995 })).toEqual({ status: "pagada", balance: 0 });
  });
  it("vencida si pasó la fecha con saldo", () => {
    expect(documentStatus({ ...base, dueDate: "2026-10-01", paid: 100 }).status).toBe("vencida");
    expect(documentStatus({ ...base, dueDate: "2026-10-01", paid: 1000 }).status).toBe("pagada");
  });
  it("cancelada no deja saldo", () => {
    expect(documentStatus({ ...base, cancelled: true })).toEqual({ status: "cancelada", balance: 0 });
  });
});

describe("monedas", () => {
  it("convierte el pago a la moneda de la cuenta", () => {
    expect(bankAmountFor(1000, "USD", "MXN", 18.5)).toBe(18500);
    expect(bankAmountFor(18500, "MXN", "USD", 18.5)).toBe(1000);
    expect(bankAmountFor(500, "MXN", "MXN", 18.5)).toBe(500);
  });
  it("lleva a pesos para sumar", () => {
    expect(toMxn(100, "USD", 18.25)).toBe(1825);
    expect(toMxn(100, "MXN", 18.25)).toBe(100);
  });
});

describe("pagos y antigüedad", () => {
  it("no deja pagar más del saldo", () => {
    expect(paymentError(0, 100)).not.toBeNull();
    expect(paymentError(100.5, 100)).not.toBeNull();
    expect(paymentError(100, 100)).toBeNull();
  });
  it("días de atraso y rango", () => {
    expect(daysOverdue("2026-10-20", "2026-10-26")).toBe(6);
    expect(daysOverdue("2026-10-30", "2026-10-26")).toBe(0);
    expect(agingBucket("2026-10-30", "2026-10-26")).toBe("al_corriente");
    expect(agingBucket("2026-09-01", "2026-10-26")).toBe("31_60");
    expect(agingBucket("2026-01-01", "2026-10-26")).toBe("90_mas");
  });
});

describe("planBatchPayment", () => {
  const d = (id: string, extra: Partial<Parameters<typeof planBatchPayment>[0][number]> = {}) => ({
    id, kind: "receivable" as const, partyName: "Aceros", currency: "MXN" as const, total: 1000, paid: 0, draft: false, cancelled: false, ...extra,
  });
  it("reparte una transferencia entre varias facturas", () => {
    const r = planBatchPayment([d("a"), d("b", { paid: 400 })], [{ documentId: "a", amount: 1000 }, { documentId: "b", amount: 600 }], "MXN", 1);
    expect(r).toMatchObject({ ok: true, kind: "receivable", total: 1600, bankTotal: 1600 });
  });
  it("facturas en dólares a una cuenta en pesos", () => {
    const r = planBatchPayment([d("a", { currency: "USD" }), d("b", { currency: "USD" })], [{ documentId: "a", amount: 100 }, { documentId: "b", amount: 50.5 }], "MXN", 18);
    expect(r.ok && [r.total, r.bankTotal]).toEqual([150.5, 2709]);
  });
  it("rechaza mezclas y montos de más", () => {
    const one = [{ documentId: "a", amount: 1 }, { documentId: "b", amount: 1 }];
    expect(planBatchPayment([d("a"), d("b", { partyName: "Otro" })], one, "MXN", 1)).toMatchObject({ ok: false, error: /mismo cliente/ });
    expect(planBatchPayment([d("a"), d("b", { currency: "USD" })], one, "MXN", 1)).toMatchObject({ ok: false, error: /misma moneda/ });
    expect(planBatchPayment([d("a"), d("b", { draft: true })], one, "MXN", 1)).toMatchObject({ ok: false, error: /borrador/ });
    expect(planBatchPayment([d("a"), d("b")], [{ documentId: "a", amount: 1 }], "MXN", 1)).toMatchObject({ ok: false, error: /al menos dos/ });
    expect(planBatchPayment([d("a"), d("b")], [{ documentId: "a", amount: 1 }, { documentId: "b", amount: 1001 }], "MXN", 1)).toMatchObject({ ok: false, error: /Factura 2/ });
  });
});
