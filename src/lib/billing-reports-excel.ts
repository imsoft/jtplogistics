/**
 * Las hojas de Excel de cada reporte de Administración. Puro: arma los
 * renglones; la descarga la hace `downloadXlsxWorkbook`.
 */

import { BILLING_KIND_LABELS, SAT_PAYMENT_FORMS } from "@/lib/billing";
import type { ExcelSheet } from "@/lib/excel-export";
import type { CashFlowReport, MonthlyExport, StatementReport } from "@/lib/billing-reports-server";

const FORM_LABEL = Object.fromEntries(SAT_PAYMENT_FORMS.map((f) => [f.value, f.label]));

const SOURCE_LABEL: Record<string, string> = {
  cobro: "Cobro a cliente",
  pago: "Pago a proveedor",
  gasto: "Gasto",
  otro: "Otro",
};

/** "15/10/2026": lo que espera ver el contador en Excel. */
export function dmy(key: string) {
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}

export function statementSheets(r: StatementReport): ExcelSheet[] {
  const isReceivable = r.kind === "receivable";
  return r.currencies.flatMap((c) => [
    {
      name: `Movimientos ${c.currency}`,
      moneyColumns: [4, 5, 6],
      aoa: [
        ["Fecha", "Tipo", "Folio", "Concepto", "Cargo", "Abono", "Saldo"],
        [dmy(r.from), "", "", "Saldo inicial", "", "", c.opening],
        ...c.lines.map((l) => [
          dmy(l.date),
          l.type === "factura" ? "Factura" : l.type === "nota" ? "Nota de crédito" : isReceivable ? "Cobro" : "Pago",
          l.folio,
          l.concept,
          l.charge || "",
          l.credit || "",
          l.balance,
        ]),
        [dmy(r.to), "", "", "Saldo final", c.charges, c.credits, c.closing],
      ],
    },
    {
      name: `Pendientes ${c.currency}`,
      moneyColumns: [3, 4],
      aoa: [
        ["Folio", "Fecha", "Vence", "Total", "Saldo", "Días de atraso"],
        ...c.open.map((o) => [o.folio, dmy(o.issueDate), dmy(o.dueDate), o.total, o.balance, o.daysOverdue || ""]),
      ],
    },
  ]);
}

export function cashFlowSheets(r: CashFlowReport): ExcelSheet[] {
  return r.currencies.flatMap((c) => [
    {
      name: `Flujo ${c.currency}`,
      moneyColumns: [1],
      aoa: [
        ["Concepto", "Importe"],
        ["Saldo inicial", c.opening],
        ...c.inflowGroups.map((g) => [`Entrada · ${g.label}`, g.amount]),
        ["Total de entradas", c.inflows],
        ...c.outflowGroups.map((g) => [`Salida · ${g.label}`, g.amount]),
        ["Total de salidas", -c.outflows],
        ["Flujo neto", c.net],
        ["Saldo final", c.closing],
      ],
    },
    {
      name: `Cuentas ${c.currency}`,
      moneyColumns: [2, 3, 4, 5],
      aoa: [
        ["Cuenta", "Banco", "Saldo inicial", "Entradas", "Salidas", "Saldo final"],
        ...c.accounts.map((a) => [a.name, a.bank ?? "", a.opening, a.inflows, a.outflows, a.closing]),
      ],
    },
  ]);
}

/** Facturas emitidas, recibidas, cobros, pagos, movimientos y gastos del periodo. */
export function monthlyExportSheets(r: MonthlyExport): ExcelSheet[] {
  const docSheet = (kind: "receivable" | "payable"): ExcelSheet => ({
    name: kind === "receivable" ? "Facturas emitidas" : "Facturas recibidas",
    moneyColumns: [8, 9, 10, 11, 12],
    aoa: [
      [
        "Fecha",
        "Vence",
        "Serie",
        "Folio",
        "Folio fiscal (UUID)",
        BILLING_KIND_LABELS[kind].party,
        "RFC",
        "Moneda",
        "Subtotal",
        "IVA",
        "Retención IVA",
        "Retención ISR",
        "Total",
        "Tipo de cambio",
        "Método de pago",
        "Concepto",
        "Referencia",
        "Estado",
      ],
      ...r.documents
        .filter((d) => d.kind === kind)
        .map((d) => [
          dmy(d.issueDate),
          dmy(d.dueDate),
          d.series ?? "",
          d.folio ?? "",
          d.uuid ?? "",
          d.partyName,
          d.partyRfc ?? "",
          d.currency,
          d.subtotal,
          d.iva,
          d.ivaWithheld,
          d.isrWithheld,
          d.total,
          d.currency === "USD" ? d.exchangeRate : "",
          d.paymentMethod,
          d.concept ?? "",
          d.reference ?? "",
          d.cancelled ? "Cancelada" : "Vigente",
        ]),
    ],
  });

  const paymentSheet = (kind: "receivable" | "payable"): ExcelSheet => ({
    name: kind === "receivable" ? "Cobros" : "Pagos",
    moneyColumns: [5, 7],
    aoa: [
      ["Fecha", BILLING_KIND_LABELS[kind].party, "RFC", "Factura", "Folio fiscal (UUID)", "Monto", "Moneda", "Monto en cuenta", "Cuenta", "Forma de pago", "Referencia"],
      ...r.payments
        .filter((p) => p.kind === kind)
        .map((p) => [
          dmy(p.paidOn),
          p.partyName,
          p.partyRfc ?? "",
          p.folio,
          p.uuid ?? "",
          p.amount,
          p.documentCurrency,
          p.bankAmount,
          `${p.bankAccountName} · ${p.bankAccountCurrency}`,
          p.paymentForm ? FORM_LABEL[p.paymentForm] ?? p.paymentForm : "",
          p.reference ?? "",
        ]),
    ],
  });

  return [
    docSheet("receivable"),
    docSheet("payable"),
    paymentSheet("receivable"),
    paymentSheet("payable"),
    {
      name: "Notas de crédito",
      moneyColumns: [10, 11, 12, 13, 14],
      aoa: [
        ["Fecha", "Tipo", "Cliente o proveedor", "RFC", "Serie", "Folio", "Folio fiscal (UUID)", "Factura", "UUID de la factura", "Moneda", "Subtotal", "IVA", "Retención IVA", "Retención ISR", "Total", "Motivo"],
        ...r.creditNotes.map((c) => [
          dmy(c.issueDate),
          c.kind === "receivable" ? "Emitida a cliente" : "Recibida de proveedor",
          c.partyName,
          c.partyRfc ?? "",
          c.series ?? "",
          c.folio ?? "",
          c.uuid ?? "",
          c.invoiceFolio,
          c.invoiceUuid ?? "",
          c.currency,
          c.subtotal,
          c.iva,
          c.ivaWithheld,
          c.isrWithheld,
          c.total,
          c.reason,
        ]),
      ],
    },
    {
      name: "Movimientos bancarios",
      moneyColumns: [3],
      aoa: [
        ["Fecha", "Cuenta", "Moneda", "Importe", "Concepto", "Referencia", "Origen", "Conciliado"],
        ...r.movements.map((m) => [dmy(m.date), m.bankAccountName, m.currency, m.amount, m.concept, m.reference ?? "", SOURCE_LABEL[m.source], m.reconciled ? "Sí" : "No"]),
      ],
    },
    {
      name: "Gastos",
      moneyColumns: [5, 6, 7],
      aoa: [
        ["Fecha", "Categoría", "Proveedor", "Descripción", "Moneda", "Subtotal", "IVA", "Total", "Tipo de cambio", "Folio fiscal (UUID)", "Cuenta"],
        ...r.expenses.map((e) => [
          dmy(e.date),
          e.category,
          e.providerName ?? "",
          e.description,
          e.currency,
          e.subtotal,
          e.iva,
          e.total,
          e.currency === "USD" ? e.exchangeRate : "",
          e.uuid ?? "",
          e.bankAccountName ?? "",
        ]),
      ],
    },
  ];
}
