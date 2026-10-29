import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { r2 } from "@/lib/billing";
import { failure, num, requireBilling, toDate, docFolio } from "@/lib/billing-server";

/** Movimientos que se muestran por omisión; lo anterior entra ya sumado al saldo. */
const RECENT_MONTHS = 6;

/**
 * GET /api/billing/banks/[id]?history=all — cuenta con sus movimientos y saldo
 * corrido. Sin `history=all` solo trae los últimos meses: el saldo de antes se
 * suma en la base de datos para que el saldo corrido siga cuadrando.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireBilling("view");
    const { id } = await params;
    const account = await prisma.bankAccount.findUnique({ where: { id } });
    if (!account) return Response.json({ error: "No encontrado" }, { status: 404 });
    const all = new URL(request.url).searchParams.get("history") === "all";
    const since = new Date();
    since.setUTCMonth(since.getUTCMonth() - RECENT_MONTHS);
    since.setUTCHours(0, 0, 0, 0);
    const [prior, olderUnreconciled] = all
      ? [null, 0]
      : await Promise.all([
          prisma.bankMovement.aggregate({ where: { bankAccountId: id, date: { lt: since } }, _sum: { amount: true } }),
          prisma.bankMovement.count({ where: { bankAccountId: id, date: { lt: since }, reconciled: false } }),
        ]);
    const movements = await prisma.bankMovement.findMany({
      where: { bankAccountId: id, ...(all ? {} : { date: { gte: since } }) },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      include: {
        createdBy: { select: { name: true } },
        payment: { select: { documentId: true, document: { select: { kind: true } } } },
        expense: { select: { id: true } },
        batchPayments: { select: { document: { select: { id: true, kind: true, series: true, folio: true } } } },
      },
    });
    let running = r2(account.initialBalance + (prior?._sum.amount ?? 0));
    const rows = movements.map((m) => {
      running = r2(running + m.amount);
      return {
        id: m.id,
        date: m.date.toISOString().slice(0, 10),
        amount: m.amount,
        concept: m.concept,
        reference: m.reference,
        reconciled: m.reconciled,
        balance: running,
        source: m.paymentId
          ? m.payment?.document.kind === "receivable" ? "cobro" : "pago"
          : m.batchPayments.length
            ? m.batchPayments[0].document.kind === "receivable" ? "cobro" : "pago"
            : m.expenseId ? "gasto" : "manual",
        documentId: m.payment?.documentId ?? null,
        documentKind: m.payment?.document.kind ?? null,
        /** Una transferencia que pagó varias facturas. */
        batchDocuments: m.batchPayments.map((p) => ({ id: p.document.id, kind: p.document.kind, folio: docFolio(p.document) })),
        createdByName: m.createdBy?.name ?? null,
      };
    });
    return Response.json({
      id: account.id,
      name: account.name,
      bank: account.bank,
      accountNumber: account.accountNumber,
      currency: account.currency,
      initialBalance: account.initialBalance,
      initialBalanceOn: account.initialBalanceOn.toISOString().slice(0, 10),
      active: account.active,
      balance: running,
      movements: rows.reverse(),
      /** Desde cuándo se muestran (null = todo el historial). */
      since: all ? null : since.toISOString().slice(0, 10),
      /** Movimientos sin conciliar anteriores a la ventana. */
      olderUnreconciled,
    });
  } catch (e) {
    return failure(e, "bank GET");
  }
}

/** PATCH /api/billing/banks/[id] — datos de la cuenta (la moneda no cambia si ya tiene movimientos). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBilling("update");
    const { id } = await params;
    const account = await prisma.bankAccount.findUnique({ where: { id }, include: { _count: { select: { movements: true } } } });
    if (!account) return Response.json({ error: "No encontrado" }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const text = (v: unknown) => (typeof v === "string" ? v.trim() || null : undefined);
    const cur = String(body.currency ?? "").toUpperCase();
    const currency = cur === "USD" || cur === "MXN" ? cur : undefined;
    if (currency && currency !== account.currency && account._count.movements > 0) {
      return Response.json({ error: "La cuenta ya tiene movimientos: no se puede cambiar la moneda." }, { status: 400 });
    }
    const initial = body.initialBalance !== undefined ? num(body.initialBalance) : undefined;
    if (initial !== undefined && !Number.isFinite(initial)) return Response.json({ error: "El saldo inicial no es válido." }, { status: 400 });
    const on = typeof body.initialBalanceOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.initialBalanceOn) ? body.initialBalanceOn : undefined;
    const name = text(body.name);
    if (name === null) return Response.json({ error: "El nombre no puede quedar vacío." }, { status: 400 });
    await prisma.bankAccount.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(text(body.bank) !== undefined && { bank: text(body.bank) }),
        ...(text(body.accountNumber) !== undefined && { accountNumber: text(body.accountNumber) }),
        ...(currency && { currency }),
        ...(initial !== undefined && { initialBalance: initial }),
        ...(on && { initialBalanceOn: toDate(on) }),
        ...(typeof body.active === "boolean" && { active: body.active }),
      },
    });
    void logAudit({ resource: "bank_account", resourceId: id, resourceLabel: name ?? account.name, action: "updated", userId: session.user.id, userName: session.user.name });
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e, "bank PATCH");
  }
}

/**
 * DELETE — borra la cuenta con todo lo que tiene: movimientos, cobros y pagos
 * registrados con ella (las facturas que pagaron vuelven a quedar con saldo).
 * Los gastos se quedan, solo pierden la cuenta.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBilling("delete");
    const { id } = await params;
    const account = await prisma.bankAccount.findUnique({ where: { id }, include: { _count: { select: { movements: true, payments: true } } } });
    if (!account) return Response.json({ error: "No encontrado" }, { status: 404 });
    await prisma.$transaction([
      // Los pagos van primero: la cuenta no se deja borrar mientras tenga pagos.
      prisma.billingPayment.deleteMany({ where: { bankAccountId: id } }),
      prisma.bankAccount.delete({ where: { id } }),
    ]);
    void logAudit({
      resource: "bank_account",
      resourceId: id,
      resourceLabel: `${account.name} · ${account._count.movements} movimiento${account._count.movements === 1 ? "" : "s"}, ${account._count.payments} cobro${account._count.payments === 1 ? "" : "s"}/pago${account._count.payments === 1 ? "" : "s"}`,
      action: "deleted",
      userId: session.user.id,
      userName: session.user.name,
    });
    return Response.json({ ok: true, movements: account._count.movements, payments: account._count.payments });
  } catch (e) {
    return failure(e, "bank DELETE");
  }
}
