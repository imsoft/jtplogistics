import { describe, expect, it } from "vitest";
import { cashFlowSheets, dmy, monthlyExportSheets, statementSheets } from "./billing-reports-excel";
import { buildCashFlow, buildStatement, type ReportDocument } from "./billing-reports";

const doc: ReportDocument = {
  id: "1", kind: "receivable", partyName: "Aceros", partyRfc: "ABA010101AB1", series: "A", folio: "7", uuid: null,
  issueDate: "2026-10-05", dueDate: "2026-11-04", currency: "MXN", exchangeRate: 1, subtotal: 100, iva: 16, ivaWithheld: 4, isrWithheld: 0,
  total: 112, paymentMethod: "PPD", concept: "Flete", reference: "ECO-1", draft: false, cancelled: false,
};

describe("hojas de Excel", () => {
  it("fechas día/mes/año", () => expect(dmy("2026-10-05")).toBe("05/10/2026"));

  it("estado de cuenta: saldo inicial, movimientos y saldo final", () => {
    const [moves, open] = statementSheets({
      kind: "receivable",
      party: { name: "Aceros", rfc: null },
      from: "2026-10-01",
      to: "2026-10-31",
      currencies: buildStatement([doc], [], "2026-10-01", "2026-10-31"),
    });
    expect(moves.name).toBe("Movimientos MXN");
    expect(moves.aoa[1]).toEqual(["01/10/2026", "", "", "Saldo inicial", "", "", 0]);
    expect(moves.aoa[2]).toEqual(["05/10/2026", "Factura", "A-7", "Flete", 112, "", 112]);
    expect(moves.aoa.at(-1)).toEqual(["31/10/2026", "", "", "Saldo final", 112, 0, 112]);
    expect(open.aoa[1]).toEqual(["A-7", "05/10/2026", "04/11/2026", 112, 112, ""]);
  });

  it("flujo: entradas, salidas y saldo por cuenta", () => {
    const [flow, accounts] = cashFlowSheets({
      from: "2026-10-01",
      to: "2026-10-31",
      currencies: buildCashFlow(
        [{ id: "a", name: "BBVA", bank: null, currency: "MXN", initialBalance: 10 }],
        [{ bankAccountId: "a", date: "2026-10-02", amount: 5, concept: "x", reference: null, source: "cobro", expenseCategory: null }],
        "2026-10-01",
        "2026-10-31"
      ),
    });
    expect(flow.aoa).toContainEqual(["Entrada · Cobros a clientes", 5]);
    expect(flow.aoa.at(-1)).toEqual(["Saldo final", 15]);
    expect(accounts.aoa[1]).toEqual(["BBVA", "", 10, 5, 0, 15]);
  });

  it("exportación mensual: una hoja por tema", () => {
    const sheets = monthlyExportSheets({ from: "2026-10-01", to: "2026-10-31", documents: [doc, { ...doc, id: "2", kind: "payable", cancelled: true }], payments: [], movements: [], creditNotes: [], expenses: [] });
    expect(sheets.map((s) => s.name)).toEqual(["Facturas emitidas", "Facturas recibidas", "Cobros", "Pagos", "Notas de crédito", "Movimientos bancarios", "Gastos"]);
    expect(sheets[0].aoa).toHaveLength(2);
    expect(sheets[1].aoa[1].at(-1)).toBe("Cancelada");
  });
});
