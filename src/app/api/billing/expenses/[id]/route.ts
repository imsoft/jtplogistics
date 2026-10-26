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

    await prisma.$transaction(async (tx) => {
      const e = await tx.expense.update({ where: { id }, data });
      await tx.bankMovement.deleteMany({ where: { expenseId: id } });
      if (account) {
        await tx.bankMovement.create({
          data: { bankAccountId: account.id, ...expenseMovement(e, account.currency), expenseId: id, createdById: session.user.id },
        });
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
