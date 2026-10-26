import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { failure, requireBilling } from "@/lib/billing-server";
import { expenseMovement, readExpenseBody } from "@/lib/billing-expenses";

const day = (d: Date) => d.toISOString().slice(0, 10);

/** GET /api/billing/expenses */
export async function GET() {
  try {
    await requireBilling("view");
    const rows = await prisma.expense.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { bankAccount: { select: { name: true, currency: true } }, createdBy: { select: { name: true } } },
    });
    return Response.json(
      rows.map((e) => ({
        id: e.id,
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
        bankAccountId: e.bankAccountId,
        bankAccountName: e.bankAccount?.name ?? null,
        notes: e.notes,
        createdByName: e.createdBy?.name ?? null,
      }))
    );
  } catch (e) {
    return failure(e, "expenses GET");
  }
}

/** POST /api/billing/expenses — si se elige cuenta, deja la salida en el banco. */
export async function POST(request: Request) {
  try {
    const session = await requireBilling("create");
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const parsed = readExpenseBody(body);
    if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
    const data = parsed.data;
    const account = data.bankAccountId ? await prisma.bankAccount.findUnique({ where: { id: data.bankAccountId } }) : null;
    if (data.bankAccountId && !account) return Response.json({ error: "La cuenta de banco no existe." }, { status: 400 });

    const created = await prisma.$transaction(async (tx) => {
      const e = await tx.expense.create({ data: { ...data, createdById: session.user.id } });
      if (account) {
        await tx.bankMovement.create({
          data: { bankAccountId: account.id, ...expenseMovement(e, account.currency), expenseId: e.id, createdById: session.user.id },
        });
      }
      return e;
    });
    void logAudit({ resource: "expense", resourceId: created.id, resourceLabel: `${created.category} · ${created.description}`, action: "created", userId: session.user.id, userName: session.user.name });
    return Response.json({ id: created.id }, { status: 201 });
  } catch (e) {
    return failure(e, "expenses POST");
  }
}
