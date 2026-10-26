import { describe, expect, it } from "vitest";
import { buildDigest, digestMessages, isWeekday, type ReminderDocument } from "./billing-reminders";

const doc = (kind: ReminderDocument["kind"], dueDate: string, balance: number, currency: ReminderDocument["currency"] = "MXN"): ReminderDocument => ({ kind, dueDate, balance, currency });

describe("recordatorio de Administración", () => {
  const today = "2026-10-26";
  const docs = [
    doc("receivable", "2026-10-20", 1000),
    doc("receivable", "2026-10-25", 50, "USD"),
    doc("receivable", "2026-10-28", 300),
    doc("receivable", "2026-10-30", 999),
    doc("receivable", "2026-10-10", 0),
    doc("payable", "2026-10-01", 200),
    doc("payable", "2026-11-02", 400),
    doc("payable", "2026-11-03", 999),
  ];

  it("separa vencido, por vencer y pagos de la semana", () => {
    const d = buildDigest(docs, today);
    expect(d.receivableOverdue).toEqual({ count: 2, amounts: { MXN: 1000, USD: 50 } });
    expect(d.receivableDueSoon).toEqual({ count: 1, amounts: { MXN: 300, USD: 0 } });
    expect(d.payableDue).toEqual({ count: 2, amounts: { MXN: 600, USD: 0 } });
  });

  it("arma un aviso de cobranza y uno de pagos", () => {
    expect(digestMessages(buildDigest(docs, today))).toEqual([
      {
        kind: "receivable",
        title: "Cobranza: 2 facturas vencidas",
        body: "2 facturas vencidas por $1,000.00 MXN y $50.00 USD; 1 factura vence en los próximos 3 días por $300.00 MXN.",
      },
      { kind: "payable", title: "Pagos de la semana: 2 facturas", body: "A transportistas y proveedores, vencidas o por vencer en 7 días: $600.00 MXN." },
    ]);
  });

  it("singular", () => {
    const [m] = digestMessages(buildDigest([doc("receivable", "2026-10-20", 10)], today));
    expect(m).toMatchObject({ title: "Cobranza: 1 factura vencida", body: "1 factura vencida por $10.00 MXN." });
    const [s] = digestMessages(buildDigest([doc("receivable", "2026-10-27", 10)], today));
    expect(s.title).toBe("Cobranza: 1 factura por vencer");
  });

  it("sin pendientes no hay aviso; el fin de semana no se manda", () => {
    expect(digestMessages(buildDigest([], today))).toEqual([]);
    expect([isWeekday("2026-10-24"), isWeekday("2026-10-25"), isWeekday("2026-10-26")]).toEqual([false, false, true]);
  });
});
