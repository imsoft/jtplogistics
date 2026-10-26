import { describe, expect, it } from "vitest";
import { buildCashFlow, buildStatement, monthRange, type CashMovement, type ReportDocument, type ReportPayment } from "./billing-reports";

function doc(id: string, issueDate: string, total: number, extra: Partial<ReportDocument> = {}): ReportDocument {
  return {
    id,
    kind: "receivable",
    partyName: "Aceros",
    partyRfc: null,
    series: "A",
    folio: id,
    uuid: null,
    issueDate,
    dueDate: issueDate,
    currency: "MXN",
    exchangeRate: 1,
    subtotal: total,
    iva: 0,
    ivaWithheld: 0,
    isrWithheld: 0,
    total,
    paymentMethod: "PPD",
    concept: null,
    reference: null,
    draft: false,
    cancelled: false,
    ...extra,
  };
}

function pay(documentId: string, paidOn: string, amount: number): ReportPayment {
  return { id: `p-${documentId}-${paidOn}`, documentId, paidOn, amount, bankAccountName: "BBVA", bankAccountCurrency: "MXN", bankAmount: amount, exchangeRate: 1, paymentForm: "03", reference: null };
}

describe("buildStatement", () => {
  const docs = [
    doc("1", "2026-09-10", 1000),
    doc("2", "2026-10-05", 500, { dueDate: "2026-10-20" }),
    doc("3", "2026-10-06", 999, { cancelled: true }),
    doc("4", "2026-10-07", 777, { draft: true, folio: null }),
    doc("5", "2026-11-02", 300),
    doc("6", "2026-10-08", 50, { currency: "USD" }),
  ];
  const payments = [pay("1", "2026-09-30", 400), pay("1", "2026-10-15", 600), pay("2", "2026-10-15", 200), pay("3", "2026-10-15", 1)];

  it("saldo inicial, movimientos del periodo y saldo final", () => {
    const [mxn, usd] = buildStatement(docs, payments, "2026-10-01", "2026-10-31");
    expect(mxn.opening).toBe(600);
    expect(mxn.lines.map((l) => [l.date, l.type, l.folio, l.balance])).toEqual([
      ["2026-10-05", "factura", "A-2", 1100],
      ["2026-10-15", "pago", "A-1", 500],
      ["2026-10-15", "pago", "A-2", 300],
    ]);
    expect(mxn).toMatchObject({ charges: 500, credits: 800, closing: 300 });
    expect(mxn.open).toEqual([{ folio: "A-2", issueDate: "2026-10-05", dueDate: "2026-10-20", total: 500, balance: 300, daysOverdue: 11 }]);
    expect(usd).toMatchObject({ currency: "USD", opening: 0, closing: 50 });
  });

  it("una nota de crédito baja el saldo como abono", () => {
    const credits = [{ id: "n1", documentId: "2", issueDate: "2026-10-20", series: "NC", folio: "1", total: 100, reason: "Descuento" }];
    const [mxn] = buildStatement(docs, payments, "2026-10-01", "2026-10-31", credits);
    expect(mxn.lines.at(-1)).toEqual({ date: "2026-10-20", type: "nota", folio: "A-2", concept: "Nota de crédito NC-1 · Descuento", charge: 0, credit: 100, balance: 200 });
    expect(mxn.closing).toBe(200);
    expect(mxn.open[0].balance).toBe(200);
  });

  it("sin facturas hasta el corte no hay estado", () => {
    expect(buildStatement(docs, payments, "2020-01-01", "2020-01-31")).toEqual([]);
  });
});

describe("buildCashFlow", () => {
  it("saldos por cuenta y agrupado por origen", () => {
    const accounts = [
      { id: "a", name: "BBVA", bank: "BBVA", currency: "MXN" as const, initialBalance: 1000 },
      { id: "b", name: "Banorte", bank: null, currency: "MXN" as const, initialBalance: 0 },
    ];
    const m = (bankAccountId: string, date: string, amount: number, source: CashMovement["source"], expenseCategory: string | null = null): CashMovement => ({
      bankAccountId,
      date,
      amount,
      concept: "x",
      reference: null,
      source,
      expenseCategory,
    });
    const [flow] = buildCashFlow(
      accounts,
      [m("a", "2026-09-20", 500, "cobro"), m("a", "2026-10-02", 2000, "cobro"), m("b", "2026-10-03", -300, "gasto", "Renta"), m("a", "2026-10-04", -800, "pago"), m("b", "2026-10-05", 100, "otro"), m("a", "2026-11-01", 999, "cobro")],
      "2026-10-01",
      "2026-10-31"
    );
    expect(flow).toMatchObject({ opening: 1500, inflows: 2100, outflows: 1100, net: 1000, closing: 2500 });
    expect(flow.inflowGroups).toEqual([{ label: "Cobros a clientes", amount: 2000 }, { label: "Otros ingresos", amount: 100 }]);
    expect(flow.outflowGroups).toEqual([{ label: "Pagos a transportistas y proveedores", amount: -800 }, { label: "Gastos · Renta", amount: -300 }]);
    expect(flow.accounts.map((a) => [a.name, a.opening, a.closing])).toEqual([["BBVA", 1500, 2700], ["Banorte", 0, -200]]);
  });
});

describe("monthRange", () => {
  it("toma el último día correcto", () => {
    expect(monthRange("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(monthRange("2028-02-15")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });
});
