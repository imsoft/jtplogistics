/**
 * Reportes de Administración, lado servidor: las consultas que alimentan el
 * estado de cuenta, el flujo de efectivo y la exportación mensual.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { toDate } from "@/lib/billing-server";
import type { BillingKind } from "@/lib/billing";
import { buildCashFlow, buildStatement, type CashMovement, type ReportCredit, type ReportDocument, type ReportPayment } from "@/lib/billing-reports";

const day = (d: Date) => d.toISOString().slice(0, 10);

type DocRow = Prisma.BillingDocumentGetPayload<object>;

function docToReport(d: DocRow): ReportDocument {
  return {
    id: d.id,
    kind: d.kind,
    partyName: d.partyName,
    partyRfc: d.partyRfc,
    series: d.series,
    folio: d.folio,
    uuid: d.uuid,
    issueDate: day(d.issueDate),
    dueDate: day(d.dueDate),
    currency: d.currency,
    exchangeRate: d.exchangeRate,
    subtotal: d.subtotal,
    iva: d.iva,
    ivaWithheld: d.ivaWithheld,
    isrWithheld: d.isrWithheld,
    total: d.total,
    paymentMethod: d.paymentMethod,
    concept: d.concept,
    reference: d.reference,
    draft: d.draft,
    cancelled: d.cancelledAt !== null,
  };
}

function creditToReport(c: Prisma.BillingCreditNoteGetPayload<object>): ReportCredit {
  return { id: c.id, documentId: c.documentId, issueDate: day(c.issueDate), series: c.series, folio: c.folio, total: c.total, reason: c.reason };
}

const PAYMENT_INCLUDE = { bankAccount: { select: { name: true, currency: true } } } satisfies Prisma.BillingPaymentInclude;

function paymentToReport(p: Prisma.BillingPaymentGetPayload<{ include: typeof PAYMENT_INCLUDE }>): ReportPayment {
  return {
    id: p.id,
    documentId: p.documentId,
    paidOn: day(p.paidOn),
    amount: p.amount,
    bankAccountName: p.bankAccount.name,
    bankAccountCurrency: p.bankAccount.currency,
    bankAmount: p.bankAmount,
    exchangeRate: p.exchangeRate,
    paymentForm: p.paymentForm,
    reference: p.reference,
  };
}

/** Estado de cuenta de un cliente (por cobrar) o proveedor (por pagar). */
export async function statementReport(kind: BillingKind, party: string, from: string, to: string) {
  const docs = await prisma.billingDocument.findMany({
    where: { kind, partyName: { equals: party.trim(), mode: "insensitive" } },
    orderBy: { issueDate: "asc" },
  });
  const payments = docs.length
    ? await prisma.billingPayment.findMany({ where: { documentId: { in: docs.map((d) => d.id) } }, include: PAYMENT_INCLUDE })
    : [];
  const credits = docs.length ? await prisma.billingCreditNote.findMany({ where: { documentId: { in: docs.map((d) => d.id) } } }) : [];
  const rfc = docs.find((d) => d.partyRfc)?.partyRfc ?? null;
  return {
    kind,
    party: { name: docs[0]?.partyName ?? party.trim(), rfc },
    from,
    to,
    currencies: buildStatement(docs.map(docToReport), payments.map(paymentToReport), from, to, credits.map(creditToReport)),
  };
}

function movementSource(m: {
  expenseId: string | null;
  payment: { document: { kind: BillingKind } } | null;
  batchPayments: { document: { kind: BillingKind } }[];
}): CashMovement["source"] {
  const doc = m.payment?.document ?? m.batchPayments[0]?.document;
  if (doc) return doc.kind === "receivable" ? "cobro" : "pago";
  if (m.expenseId) return "gasto";
  return "otro";
}

const MOVEMENT_INCLUDE = {
  bankAccount: { select: { name: true, currency: true } },
  payment: { select: { document: { select: { kind: true, partyName: true, series: true, folio: true } } } },
  expense: { select: { category: true, providerName: true } },
  batchPayments: { take: 1, select: { document: { select: { kind: true } } } },
} satisfies Prisma.BankMovementInclude;

/** Flujo de efectivo: todas las cuentas, con lo que pasó en el periodo. */
export async function cashFlowReport(from: string, to: string) {
  // Lo anterior al periodo solo hace falta sumado (saldo inicial): no se trae
  // movimiento por movimiento.
  const [accounts, prior, movements] = await Promise.all([
    prisma.bankAccount.findMany({ orderBy: [{ currency: "asc" }, { name: "asc" }] }),
    prisma.bankMovement.groupBy({ by: ["bankAccountId"], where: { date: { lt: toDate(from) } }, _sum: { amount: true } }),
    prisma.bankMovement.findMany({ where: { date: { gte: toDate(from), lte: toDate(to) } }, include: MOVEMENT_INCLUDE }),
  ]);
  const priorSum = new Map(prior.map((p) => [p.bankAccountId, p._sum.amount ?? 0]));
  return {
    from,
    to,
    currencies: buildCashFlow(
      accounts.map((a) => ({ id: a.id, name: a.name, bank: a.bank, currency: a.currency, initialBalance: a.initialBalance + (priorSum.get(a.id) ?? 0) })),
      movements.map((m) => ({
        bankAccountId: m.bankAccountId,
        date: day(m.date),
        amount: m.amount,
        concept: m.concept,
        reference: m.reference,
        source: movementSource(m),
        expenseCategory: m.expense?.category ?? null,
      })),
      from,
      to
    ),
  };
}

/**
 * Exportación para el contador: lo que pasó en el periodo, renglón por
 * renglón. Las facturas van por fecha de emisión (los borradores no son
 * facturas y no se incluyen); cobros, pagos, movimientos y gastos por su fecha.
 */
export async function monthlyExport(from: string, to: string) {
  const range = { gte: toDate(from), lte: toDate(to) };
  const [documents, payments, movements, expenses, creditNotes] = await Promise.all([
    prisma.billingDocument.findMany({ where: { draft: false, issueDate: range }, orderBy: [{ kind: "asc" }, { issueDate: "asc" }] }),
    prisma.billingPayment.findMany({
      where: { paidOn: range },
      include: { ...PAYMENT_INCLUDE, document: { select: { kind: true, partyName: true, partyRfc: true, series: true, folio: true, uuid: true, currency: true } } },
      orderBy: { paidOn: "asc" },
    }),
    prisma.bankMovement.findMany({ where: { date: range }, include: MOVEMENT_INCLUDE, orderBy: [{ date: "asc" }, { createdAt: "asc" }] }),
    prisma.expense.findMany({ where: { date: range }, include: { bankAccount: { select: { name: true } } }, orderBy: { date: "asc" } }),
    prisma.billingCreditNote.findMany({
      where: { issueDate: range },
      include: { document: { select: { kind: true, partyName: true, partyRfc: true, series: true, folio: true, uuid: true, currency: true } } },
      orderBy: { issueDate: "asc" },
    }),
  ]);
  return {
    from,
    to,
    documents: documents.map(docToReport),
    payments: payments.map((p) => ({
      ...paymentToReport(p),
      kind: p.document.kind,
      partyName: p.document.partyName,
      partyRfc: p.document.partyRfc,
      folio: p.document.folio ? [p.document.series, p.document.folio].filter(Boolean).join("-") : "Borrador",
      uuid: p.document.uuid,
      documentCurrency: p.document.currency,
    })),
    movements: movements.map((m) => ({
      date: day(m.date),
      bankAccountName: m.bankAccount.name,
      currency: m.bankAccount.currency,
      amount: m.amount,
      concept: m.concept,
      reference: m.reference,
      source: movementSource(m),
      reconciled: m.reconciled,
    })),
    creditNotes: creditNotes.map((c) => ({
      issueDate: day(c.issueDate),
      kind: c.document.kind,
      partyName: c.document.partyName,
      partyRfc: c.document.partyRfc,
      series: c.series,
      folio: c.folio,
      uuid: c.uuid,
      invoiceFolio: c.document.folio ? [c.document.series, c.document.folio].filter(Boolean).join("-") : "Borrador",
      invoiceUuid: c.document.uuid,
      currency: c.document.currency,
      subtotal: c.subtotal,
      iva: c.iva,
      ivaWithheld: c.ivaWithheld,
      isrWithheld: c.isrWithheld,
      total: c.total,
      reason: c.reason,
    })),
    expenses: expenses.map((e) => ({
      date: day(e.date),
      category: e.category,
      providerName: e.providerName,
      description: e.description,
      currency: e.currency,
      exchangeRate: e.exchangeRate,
      subtotal: e.subtotal,
      iva: e.iva,
      total: e.total,
      uuid: e.uuid,
      bankAccountName: e.bankAccount?.name ?? null,
    })),
  };
}

export type StatementReport = Awaited<ReturnType<typeof statementReport>>;
export type CashFlowReport = Awaited<ReturnType<typeof cashFlowReport>>;
export type MonthlyExport = Awaited<ReturnType<typeof monthlyExport>>;
