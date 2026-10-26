import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { failure, requireBilling } from "@/lib/billing-server";
import { expenseMovement, readExpenseBody } from "@/lib/billing-expenses";

/** PATCH — edita el gasto y rehace su movimiento de banco. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBilling("update");
    const { id } = await params;
    const current = await prisma.expense.findUnique({ where: { id } });
    if (!current) return Response.json({ error: "No encontrado" }, { status: 404 });
    const parsed = readExpenseBody((await request.json().catch(() => ({}))) as Record<string, unknown>);
    if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
    const data = parsed.data;
    const account = data.bankAccountId ? await prisma.bankAccount.findUnique({ where: { id: data.bankAccountId } }) : null;
    if (data.bankAccountId && !account) return Response.json({ error: "La cuenta de banco no existe." }, { status: 400 });
    if (account && !account.active && account.id !== current.bankAccountId) {
      return Response.json({ error: "Esa cuenta de banco está desactivada." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const e = await tx.expense.update({ where: { id }, data });
      const prev = await tx.bankMovement.findUnique({ where: { expenseId: id } });
      if (!account) {
        if (prev) await tx.bankMovement.delete({ where: { id: prev.id } });
        return;
      }
      const next = expenseMovement(e, account.currency);
      // Corregir la descripción no deshace la conciliación: solo si cambia
      // la cuenta, el importe o la fecha hay que volver a conciliar.
      const same = prev && prev.bankAccountId === account.id && prev.amount === next.amount && prev.date.getTime() === next.date.getTime();
      if (prev) {
        await tx.bankMovement.update({
          where: { id: prev.id },
          data: { bankAccountId: account.id, ...next, reconciled: same ? prev.reconciled : false },
        });
      } else {
        await tx.bankMovement.create({ data: { bankAccountId: account.id, ...next, expenseId: id, createdById: session.user.id } });
      }
    });
    void logAudit({ resource: "expense", resourceId: id, resourceLabel: `${data.category} · ${data.description}`, action: "updated", userId: session.user.id, userName: session.user.name });
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e, "expense PATCH");
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBilling("delete");
    const { id } = await params;
    const current = await prisma.expense.findUnique({ where: { id } });
    if (!current) return Response.json({ error: "No encontrado" }, { status: 404 });
    await prisma.expense.delete({ where: { id } });
    void logAudit({ resource: "expense", resourceId: id, resourceLabel: `${current.category} · ${current.description}`, action: "deleted", userId: session.user.id, userName: session.user.name });
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e, "expense DELETE");
  }
}
