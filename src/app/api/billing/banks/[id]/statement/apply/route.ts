import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { hasModuleAccess } from "@/lib/module-access";
import { BILLING_MODULE, failure, requireBilling, toDate } from "@/lib/billing-server";
import { readStatementLines } from "@/lib/bank-statement";

/**
 * POST /api/billing/banks/[id]/statement/apply { reconcile: [movementId], create: [line] }
 * Marca como conciliados los movimientos que empataron y da de alta (ya
 * conciliados) los del banco que faltaban en la plataforma.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBilling("update");
    const { id } = await params;
    const account = await prisma.bankAccount.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!account) return Response.json({ error: "No encontrado" }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const ids = (Array.isArray(body.reconcile) ? body.reconcile : []).filter((x): x is string => typeof x === "string").slice(0, 3000);
    const create = Array.isArray(body.create) && body.create.length > 0 ? readStatementLines(body.create) : [];
    if (create === null) return Response.json({ error: "Hay renglones del banco que no son válidos." }, { status: 400 });
    if (create.length > 0 && !(await hasModuleAccess(session.user, BILLING_MODULE, "create"))) {
      return Response.json({ error: "No tienes permiso para dar de alta movimientos." }, { status: 403 });
    }
    if (ids.length === 0 && create.length === 0) return Response.json({ error: "No hay nada que aplicar." }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      // Solo movimientos de esta cuenta.
      const reconciled = ids.length
        ? await tx.bankMovement.updateMany({ where: { id: { in: ids }, bankAccountId: id }, data: { reconciled: true } })
        : { count: 0 };
      if (create.length) {
        await tx.bankMovement.createMany({
          data: create.map((l) => ({
            bankAccountId: id,
            date: toDate(l.date),
            amount: l.amount,
            concept: `Banco: ${l.description}`.slice(0, 250),
            reference: l.reference,
            reconciled: true,
            createdById: session.user.id,
          })),
        });
      }
      return { reconciled: reconciled.count, created: create.length };
    });

    void logAudit({
      resource: "bank_account",
      resourceId: id,
      resourceLabel: account.name,
      action: "updated",
      userId: session.user.id,
      userName: session.user.name,
      changes: [{ field: "statement", label: "Conciliación con estado de cuenta", from: null, to: `${result.reconciled} conciliados, ${result.created} dados de alta` }],
    });
    return Response.json(result);
  } catch (e) {
    return failure(e, "statement apply");
  }
}
