import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { companyDateKey } from "@/lib/time-clock";
import { bankAmountFor, documentStatus, paymentError, r2 } from "@/lib/billing";
import { failure, num, paymentConcept, requireBilling, toDate, docFolio } from "@/lib/billing-server";

/**
 * POST /api/billing/documents/[id]/payments
 * Registra un cobro (cuenta por cobrar) o un pago (cuenta por pagar) y deja
 * su movimiento en la cuenta de banco: entra si es cobro, sale si es pago.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBilling("update");
    const { id } = await params;
    const doc = await prisma.billingDocument.findUnique({ where: { id }, include: { payments: { select: { amount: true } } } });
    if (!doc) return Response.json({ error: "No encontrado" }, { status: 404 });
    if (doc.cancelledAt) return Response.json({ error: "La factura está cancelada." }, { status: 400 });
    if (doc.draft) return Response.json({ error: "Es un borrador: primero registra la factura emitida con su folio." }, { status: 400 });

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const paidOn = typeof body.paidOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.paidOn) ? body.paidOn : null;
    if (!paidOn) return Response.json({ error: "Elige la fecha del pago." }, { status: 400 });
    if (paidOn > companyDateKey()) return Response.json({ error: "La fecha del pago no puede ser futura." }, { status: 400 });

    const account = typeof body.bankAccountId === "string"
      ? await prisma.bankAccount.findUnique({ where: { id: body.bankAccountId } })
      : null;
    if (!account) return Response.json({ error: "Elige la cuenta de banco." }, { status: 400 });

    const paid = r2(doc.payments.reduce((s, p) => s + p.amount, 0));
    const { balance } = documentStatus({ total: doc.total, paid, dueDate: "9999-12-31", cancelled: false, todayKey: "0000-01-01" });
    const amount = r2(num(body.amount));
    const err = paymentError(amount, balance);
    if (err) return Response.json({ error: err }, { status: 400 });

    const needsRate = doc.currency !== account.currency;
    const rate = needsRate ? num(body.exchangeRate) : 1;
    if (needsRate && (!Number.isFinite(rate) || rate <= 0)) {
      return Response.json({ error: "Escribe el tipo de cambio del día del pago." }, { status: 400 });
    }
    const bankAmount = bankAmountFor(amount, doc.currency, account.currency, rate);
    const sign = doc.kind === "receivable" ? 1 : -1;
    const text = (v: unknown) => (typeof v === "string" ? v.trim() || null : null);

    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.billingPayment.create({
        data: {
          documentId: id,
          paidOn: toDate(paidOn),
          amount,
          bankAccountId: account.id,
          bankAmount,
          exchangeRate: rate,
          paymentForm: text(body.paymentForm),
          reference: text(body.reference),
          notes: text(body.notes),
          createdById: session.user.id,
        },
      });
      await tx.bankMovement.create({
        data: {
          bankAccountId: account.id,
          date: toDate(paidOn),
          amount: r2(sign * bankAmount),
          concept: paymentConcept(doc.kind, doc),
          reference: text(body.reference),
          paymentId: p.id,
          createdById: session.user.id,
        },
      });
      return p;
    });

    void logAudit({
      resource: "billing_document",
      resourceId: id,
      resourceLabel: `${docFolio(doc)} · ${doc.partyName}`,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
      changes: [{ field: "payment", label: doc.kind === "receivable" ? "Cobro" : "Pago", from: null, to: `${amount.toFixed(2)} ${doc.currency} · ${account.name}` }],
    });

    return Response.json({ id: payment.id }, { status: 201 });
  } catch (e) {
    return failure(e, "payment POST");
  }
}
