import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { companyDateKey } from "@/lib/time-clock";
import { planBatchPayment, r2 } from "@/lib/billing";
import { APPLIED_SELECT, appliedOf, docFolio, failure, num, requireBilling, toDate } from "@/lib/billing-server";

/**
 * POST /api/billing/payments/batch
 * { paidOn, bankAccountId, exchangeRate?, paymentForm?, reference?, notes?, items: [{ documentId, amount }] }
 *
 * Una sola transferencia que paga varias facturas del mismo cliente o
 * proveedor: un cobro por factura y un solo movimiento en el banco, igual que
 * en el estado de cuenta del banco.
 */
export async function POST(request: Request) {
  try {
    const session = await requireBilling("update");
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const text = (v: unknown) => (typeof v === "string" ? v.trim() || null : null);

    const paidOn = typeof body.paidOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.paidOn) ? body.paidOn : null;
    if (!paidOn) return Response.json({ error: "Elige la fecha del pago." }, { status: 400 });
    if (paidOn > companyDateKey()) return Response.json({ error: "La fecha del pago no puede ser futura." }, { status: 400 });
    const account = typeof body.bankAccountId === "string" ? await prisma.bankAccount.findUnique({ where: { id: body.bankAccountId } }) : null;
    if (!account) return Response.json({ error: "Elige la cuenta de banco." }, { status: 400 });

    const items = (Array.isArray(body.items) ? body.items : [])
      .slice(0, 100)
      .map((i) => i as Record<string, unknown>)
      .map((i) => ({ documentId: typeof i.documentId === "string" ? i.documentId : "", amount: num(i.amount) }));
    const docs = await prisma.billingDocument.findMany({
      where: { id: { in: items.map((i) => i.documentId) } },
      include: APPLIED_SELECT,
    });
    const rate = num(body.exchangeRate);
    const plan = planBatchPayment(
      docs.map((d) => ({
        id: d.id,
        kind: d.kind,
        partyName: d.partyName,
        currency: d.currency,
        total: d.total,
        paid: appliedOf(d).applied,
        draft: d.draft,
        cancelled: d.cancelledAt !== null,
      })),
      items,
      account.currency,
      rate
    );
    if (!plan.ok) return Response.json({ error: plan.error }, { status: 400 });

    const byId = new Map(docs.map((d) => [d.id, d]));
    const folios = plan.items.map((i) => docFolio(byId.get(i.documentId)!));
    const party = byId.get(plan.items[0].documentId)!.partyName;
    const label = plan.kind === "receivable" ? "Cobro" : "Pago";
    const concept = `${label} facturas ${folios.join(", ")} · ${party}`.slice(0, 250);
    const exchangeRate = plan.currency === account.currency ? 1 : rate;

    const movement = await prisma.$transaction(async (tx) => {
      const m = await tx.bankMovement.create({
        data: {
          bankAccountId: account.id,
          date: toDate(paidOn),
          amount: r2((plan.kind === "receivable" ? 1 : -1) * plan.bankTotal),
          concept,
          reference: text(body.reference),
          createdById: session.user.id,
        },
      });
      await tx.billingPayment.createMany({
        data: plan.items.map((i) => ({
          documentId: i.documentId,
          paidOn: toDate(paidOn),
          amount: i.amount,
          bankAccountId: account.id,
          bankAmount: i.bankAmount,
          exchangeRate,
          paymentForm: text(body.paymentForm),
          reference: text(body.reference),
          notes: text(body.notes),
          batchMovementId: m.id,
          createdById: session.user.id,
        })),
      });
      return m;
    });

    for (const i of plan.items) {
      const d = byId.get(i.documentId)!;
      void logAudit({
        resource: "billing_document",
        resourceId: d.id,
        resourceLabel: `${docFolio(d)} · ${d.partyName}`,
        action: "updated",
        userId: session.user.id,
        userName: session.user.name,
        changes: [{ field: "payment", label, from: null, to: `${i.amount.toFixed(2)} ${d.currency} · ${account.name} (transferencia de ${plan.items.length} facturas)` }],
      });
    }
    return Response.json({ movementId: movement.id, count: plan.items.length }, { status: 201 });
  } catch (e) {
    return failure(e, "batch payment POST");
  }
}
