/**
 * Administración, lado servidor: lectura segura del cuerpo, forma del JSON y
 * consultas compartidas por las rutas de /api/billing.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireModuleAccess, type ModuleAction } from "@/lib/module-access";
import { companyDateKey } from "@/lib/time-clock";
import { SETTLED_TOLERANCE, computeTotals, documentStatus, r2, type BillingKind, type Currency } from "@/lib/billing";
import type { CartaPorteSnapshot } from "@/lib/shipment-billing";

/** Sufijo de los permisos: canView/Create/Update/DeleteBilling. */
export const BILLING_MODULE = "Billing";

export function requireBilling(action: ModuleAction) {
  return requireModuleAccess(BILLING_MODULE, action);
}

export const KIND_SLUGS: Record<string, BillingKind> = { receivables: "receivable", payables: "payable" };

export function isBillingKind(v: unknown): v is BillingKind {
  return v === "receivable" || v === "payable";
}

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** Lo que baja el saldo de una factura: cobros o pagos y notas de crédito. */
export const APPLIED_SELECT = {
  payments: { select: { amount: true } },
  creditNotes: { select: { total: true } },
} satisfies Prisma.BillingDocumentInclude;

export function appliedOf(d: { payments: { amount: number }[]; creditNotes: { total: number }[] }) {
  const paid = r2(d.payments.reduce((s, p) => s + p.amount, 0));
  const credited = r2(d.creditNotes.reduce((s, c) => s + c.total, 0));
  return { paid, credited, applied: r2(paid + credited) };
}

type Tx = Prisma.TransactionClient;

/**
 * Bloquea las facturas hasta que termine la transacción y devuelve lo que ya
 * se les aplicó. Dos cobros (o un cobro y una nota de crédito) al mismo tiempo
 * esperan su turno: el segundo ve el saldo que dejó el primero y no puede
 * pasarse.
 */
export async function lockDocuments(tx: Tx, ids: string[]) {
  if (ids.length === 0) return new Map<string, { applied: number; cancelled: boolean; draft: boolean; total: number }>();
  await tx.$queryRaw`SELECT id FROM billing_documents WHERE id IN (${Prisma.join(ids)}) FOR UPDATE`;
  const docs = await tx.billingDocument.findMany({
    where: { id: { in: ids } },
    select: { id: true, total: true, draft: true, cancelledAt: true, ...APPLIED_SELECT },
  });
  return new Map(docs.map((d) => [d.id, { applied: appliedOf(d).applied, cancelled: d.cancelledAt !== null, draft: d.draft, total: d.total }]));
}

/**
 * Otra factura vigente (no cancelada) que choca con esta: mismo folio y serie
 * de la misma contraparte, mismo folio fiscal, o la misma del embarque. Se usa
 * al crear, editar, emitir un borrador y reactivar.
 */
export async function duplicateDocument(
  kind: BillingKind,
  d: { folio?: string | null; series?: string | null; partyName: string; uuid?: string | null; shipmentId?: string | null },
  exceptId?: string
): Promise<string | null> {
  const not = exceptId ? { id: { not: exceptId } } : {};
  const or: Prisma.BillingDocumentWhereInput[] = [];
  if (d.folio) or.push({ folio: d.folio, series: d.series ?? null, partyName: { equals: d.partyName, mode: "insensitive" } });
  if (d.uuid) or.push({ uuid: d.uuid });
  if (d.shipmentId) or.push({ shipmentId: d.shipmentId });
  if (or.length === 0) return null;
  const hit = await prisma.billingDocument.findFirst({ where: { kind, cancelledAt: null, ...not, OR: or }, select: { id: true } });
  return hit?.id ?? null;
}

/**
 * Facturas vigentes con saldo (y borradores), con el saldo ya calculado por la
 * base de datos. El resumen del inicio y el recordatorio diario solo necesitan
 * esto: traer todas las facturas con todos sus pagos crecía con cada factura.
 */
export async function openDocumentBalances(): Promise<
  { id: string; kind: BillingKind; currency: Currency; dueDate: string; balance: number; draft: boolean }[]
> {
  const rows = await prisma.$queryRaw<{ id: string; kind: string; currency: string; due_date: Date; balance: number; draft: boolean }[]>`
    SELECT d.id, d.kind::text AS kind, d.currency::text AS currency, d.due_date, d.draft,
           (d.total - COALESCE(p.paid, 0) - COALESCE(c.credited, 0))::float8 AS balance
    FROM billing_documents d
    LEFT JOIN (SELECT document_id, SUM(amount) AS paid FROM billing_payments GROUP BY document_id) p ON p.document_id = d.id
    LEFT JOIN (SELECT document_id, SUM(total) AS credited FROM billing_credit_notes GROUP BY document_id) c ON c.document_id = d.id
    WHERE d.cancelled_at IS NULL
      AND (d.draft OR d.total - COALESCE(p.paid, 0) - COALESCE(c.credited, 0) > ${SETTLED_TOLERANCE})`;
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind as BillingKind,
    currency: r.currency as Currency,
    dueDate: r.due_date.toISOString().slice(0, 10),
    balance: r2(Number(r.balance)),
    draft: r.draft,
  }));
}

/** Prisma P2002 (único repetido) → mensaje claro en lugar de un error del servidor. */
export function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}

export const DOC_INCLUDE = {
  payments: {
    orderBy: [{ paidOn: "asc" }, { createdAt: "asc" }],
    include: {
      bankAccount: { select: { id: true, name: true, currency: true } },
      createdBy: { select: { name: true } },
      batchMovement: { select: { amount: true, _count: { select: { batchPayments: true } } } },
    },
  },
  createdBy: { select: { name: true } },
  shipment: { select: { eco: true } },
  attachments: { orderBy: { createdAt: "asc" }, select: { id: true, kind: true, fileName: true, size: true, createdAt: true, cfdi: true, creditNoteId: true } },
  creditNotes: { orderBy: [{ issueDate: "asc" }, { createdAt: "asc" }], include: { createdBy: { select: { name: true } } } },
} satisfies Prisma.BillingDocumentInclude;

type DocRow = Prisma.BillingDocumentGetPayload<{ include: typeof DOC_INCLUDE }>;

export function documentToJson(d: DocRow, todayKey = companyDateKey()) {
  const { paid, credited, applied } = appliedOf(d);
  const { status, balance } = documentStatus({
    total: d.total,
    paid: applied,
    dueDate: day(d.dueDate)!,
    cancelled: d.cancelledAt !== null,
    draft: d.draft,
    todayKey,
  });
  return {
    id: d.id,
    kind: d.kind,
    clientId: d.clientId,
    partyName: d.partyName,
    partyRfc: d.partyRfc,
    series: d.series,
    folio: d.folio,
    draft: d.draft,
    shipmentId: d.shipmentId,
    shipmentEco: d.shipment?.eco ?? null,
    cartaPorte: (d.cartaPorte ?? null) as CartaPorteSnapshot | null,
    uuid: d.uuid,
    issueDate: day(d.issueDate)!,
    dueDate: day(d.dueDate)!,
    currency: d.currency,
    exchangeRate: d.exchangeRate,
    subtotal: d.subtotal,
    ivaRate: d.ivaRate,
    iva: d.iva,
    ivaWithheld: d.ivaWithheld,
    isrWithheld: d.isrWithheld,
    total: d.total,
    paymentMethod: d.paymentMethod,
    attachments: d.attachments.map((a) => ({
      id: a.id,
      kind: a.kind as "xml" | "pdf",
      fileName: a.fileName,
      size: a.size,
      createdAt: a.createdAt.toISOString(),
      hasCfdi: a.cfdi !== null,
      creditNoteId: a.creditNoteId,
    })),
    /** Los importes salen del XML: no se editan a mano. */
    fromXml: d.attachments.some((a) => a.kind === "xml" && a.cfdi !== null && !a.creditNoteId),
    credited,
    creditNotes: d.creditNotes.map((c) => ({
      id: c.id,
      issueDate: day(c.issueDate)!,
      series: c.series,
      folio: c.folio,
      uuid: c.uuid,
      subtotal: c.subtotal,
      iva: c.iva,
      ivaWithheld: c.ivaWithheld,
      isrWithheld: c.isrWithheld,
      total: c.total,
      reason: c.reason,
      createdByName: c.createdBy?.name ?? null,
    })),
    concept: d.concept,
    reference: d.reference,
    notes: d.notes,
    source: d.source,
    cancelledAt: d.cancelledAt?.toISOString() ?? null,
    cancelReason: d.cancelReason,
    createdByName: d.createdBy?.name ?? null,
    createdAt: d.createdAt.toISOString(),
    paid,
    balance,
    status,
    payments: d.payments.map((p) => ({
      id: p.id,
      paidOn: day(p.paidOn)!,
      amount: p.amount,
      bankAccountId: p.bankAccountId,
      bankAccountName: p.bankAccount.name,
      bankAccountCurrency: p.bankAccount.currency,
      bankAmount: p.bankAmount,
      exchangeRate: p.exchangeRate,
      paymentForm: p.paymentForm,
      reference: p.reference,
      notes: p.notes,
      /** Si fue parte de una transferencia que pagó varias facturas: cuántas y por cuánto. */
      batch: p.batchMovement ? { count: p.batchMovement._count.batchPayments, bankAmount: Math.abs(p.batchMovement.amount) } : null,
      createdByName: p.createdBy?.name ?? null,
    })),
  };
}

export type DocumentJson = ReturnType<typeof documentToJson>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const toDate = (v: string) => new Date(`${v}T00:00:00.000Z`);

/** Número desde "12,345.67", "$100" o 100; NaN si no es número. */
export function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v !== "string" || !v.trim()) return NaN;
  return Number(v.replace(/[$,\s]/g, ""));
}

const text = (v: unknown) => (typeof v === "string" ? v.trim() || null : null);
export const upper = (v: unknown) => (typeof v === "string" ? v.trim().toUpperCase() : "");

/**
 * Lee y valida el cuerpo de una factura. Los importes se recalculan aquí a
 * partir del subtotal y las tasas: el total nunca se confía del navegador.
 */
export function readDocumentBody(body: Record<string, unknown>):
  | { ok: true; data: Omit<Prisma.BillingDocumentUncheckedCreateInput, "kind" | "createdById"> }
  | { ok: false; error: string } {
  const partyName = text(body.partyName);
  const folio = text(body.folio);
  // Un borrador todavía no tiene folio: lo recibe al emitirse la factura.
  const draft = body.draft === true;
  const issueDate = typeof body.issueDate === "string" && DATE_RE.test(body.issueDate) ? body.issueDate : null;
  const dueDate = typeof body.dueDate === "string" && DATE_RE.test(body.dueDate) ? body.dueDate : null;
  // Los formularios pasan el texto a minúsculas: se comparan sin importar mayúsculas.
  const currency: Currency = upper(body.currency) === "USD" ? "USD" : "MXN";
  const exchangeRate = currency === "USD" ? num(body.exchangeRate) : 1;
  const subtotal = num(body.subtotal);
  const ivaRate = body.ivaRate === undefined || body.ivaRate === "" ? 0.16 : num(body.ivaRate);
  const withholdingRate = body.withholdingRate === undefined || body.withholdingRate === "" ? 0 : num(body.withholdingRate);

  if (!partyName) return { ok: false, error: "Escribe el nombre del cliente o proveedor." };
  if (!folio && !draft) return { ok: false, error: "Escribe el folio de la factura." };
  if (!issueDate) return { ok: false, error: "Elige la fecha de la factura." };
  if (!dueDate) return { ok: false, error: "Elige la fecha de vencimiento." };
  if (dueDate < issueDate) return { ok: false, error: "El vencimiento no puede ser antes de la fecha de la factura." };
  if (!Number.isFinite(subtotal) || subtotal <= 0) return { ok: false, error: "El subtotal debe ser mayor a cero." };
  if (!Number.isFinite(ivaRate) || ivaRate < 0 || ivaRate > 0.16) return { ok: false, error: "La tasa de IVA no es válida." };
  if (!Number.isFinite(withholdingRate) || withholdingRate < 0 || withholdingRate > 0.16) {
    return { ok: false, error: "La retención no es válida." };
  }
  if (currency === "USD" && (!Number.isFinite(exchangeRate) || exchangeRate <= 0)) {
    return { ok: false, error: "Escribe el tipo de cambio de la factura." };
  }
  const uuid = text(body.uuid)?.toUpperCase() ?? null;
  if (uuid && !/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/.test(uuid)) {
    return { ok: false, error: "El folio fiscal (UUID) no tiene el formato correcto." };
  }

  const totals = computeTotals({ subtotal, ivaRate, withholdingRate });
  return {
    ok: true,
    data: {
      partyName,
      partyRfc: text(body.partyRfc)?.toUpperCase() ?? null,
      clientId: text(body.clientId),
      series: text(body.series)?.toUpperCase() ?? null,
      folio: folio?.toUpperCase() ?? null,
      draft,
      uuid,
      issueDate: toDate(issueDate),
      dueDate: toDate(dueDate),
      currency,
      exchangeRate: currency === "USD" ? exchangeRate : 1,
      subtotal: totals.subtotal,
      ivaRate,
      iva: totals.iva,
      ivaWithheld: totals.ivaWithheld,
      // La retención de ISR solo llega del XML.
      isrWithheld: 0,
      total: totals.total,
      paymentMethod: upper(body.paymentMethod) === "PUE" ? "PUE" : "PPD",
      concept: text(body.concept),
      reference: text(body.reference),
      notes: text(body.notes),
      source: typeof body.source === "string" && body.source.toLowerCase() === "alegra" ? "alegra" : "manual",
    },
  };
}

/** Saldo de cada cuenta: saldo inicial más todos sus movimientos. */
export async function bankBalances(): Promise<Map<string, number>> {
  const [accounts, sums] = await Promise.all([
    prisma.bankAccount.findMany({ select: { id: true, initialBalance: true } }),
    prisma.bankMovement.groupBy({ by: ["bankAccountId"], _sum: { amount: true } }),
  ]);
  const sumMap = new Map(sums.map((s) => [s.bankAccountId, s._sum.amount ?? 0]));
  return new Map(accounts.map((a) => [a.id, r2(a.initialBalance + (sumMap.get(a.id) ?? 0))]));
}

/** Concepto del movimiento bancario que deja un cobro o pago. */
export function paymentConcept(kind: BillingKind, doc: { series: string | null; folio: string | null; partyName: string }) {
  const folio = docFolio(doc);
  return `${kind === "receivable" ? "Cobro" : "Pago"} factura ${folio} · ${doc.partyName}`;
}

/** "A-123", o "Borrador" mientras no tiene folio. */
export function docFolio(d: { series?: string | null; folio?: string | null }) {
  return d.folio ? [d.series, d.folio].filter(Boolean).join("-") : "Borrador";
}

export function failure(e: unknown, where: string) {
  if (e instanceof Response) return e;
  if (isUniqueViolation(e)) {
    return Response.json({ error: "Ya existe un registro con esos datos (folio o folio fiscal repetido)." }, { status: 409 });
  }
  console.error(`[billing] ${where}`, e);
  return Response.json({ error: "Error interno del servidor" }, { status: 500 });
}
