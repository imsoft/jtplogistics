import { describe, expect, it } from "vitest";
import { summarizeBilling } from "./billing-overview";

describe("resumen de Administración", () => {
  it("bancos, vencido por cobrar, pagos de la semana y flujo del mes", () => {
    const o = summarizeBilling(
      [
        { kind: "receivable", dueDate: "2026-10-20", currency: "MXN", balance: 1000, draft: false },
        { kind: "receivable", dueDate: "2026-11-20", currency: "MXN", balance: 500, draft: false },
        { kind: "receivable", dueDate: "2026-10-01", currency: "USD", balance: 50, draft: false },
        { kind: "receivable", dueDate: "2026-10-01", currency: "MXN", balance: 0, draft: false },
        { kind: "receivable", dueDate: "2026-10-01", currency: "MXN", balance: 0, draft: true },
        { kind: "payable", dueDate: "2026-10-30", currency: "MXN", balance: 300, draft: false },
        { kind: "payable", dueDate: "2026-11-30", currency: "MXN", balance: 700, draft: false },
      ],
      [
        { currency: "MXN", balance: 10000, unreconciled: 2 },
        { currency: "USD", balance: 200, unreconciled: 1 },
      ],
      [
        { currency: "MXN", date: "2026-09-30", amount: 999 },
        { currency: "MXN", date: "2026-10-02", amount: 1120 },
        { currency: "MXN", date: "2026-10-05", amount: -400 },
        { currency: "USD", date: "2026-10-06", amount: 20 },
      ],
      "2026-10-26"
    );
    expect(o).toEqual({
      bank: { MXN: 10000, USD: 200 },
      unreconciled: 3,
      receivableOpen: { MXN: 1500, USD: 50 },
      receivableOverdue: { MXN: 1000, USD: 50 },
      receivableOverdueCount: 2,
      payableOpen: { MXN: 1000, USD: 0 },
      payableWeek: { MXN: 300, USD: 0 },
      payableWeekCount: 1,
      monthIn: { MXN: 1120, USD: 20 },
      monthOut: { MXN: 400, USD: 0 },
      drafts: 1,
    });
  });
});
