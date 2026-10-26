import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";
import { bankBalances, failure, num, requireBilling, toDate } from "@/lib/billing-server";

/** GET /api/billing/banks — cuentas con su saldo actual. */
export async function GET() {
  try {
    await requireBilling("view");
    const [accounts, balances, pending] = await Promise.all([
      prisma.bankAccount.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
      bankBalances(),
      prisma.bankMovement.groupBy({ by: ["bankAccountId"], where: { reconciled: false }, _count: true }),
    ]);
    const pendingMap = new Map(pending.map((p) => [p.bankAccountId, p._count]));
    return Response.json(
      accounts.map((a) => ({
        id: a.id,
        name: a.name,
        bank: a.bank,
        accountNumber: a.accountNumber,
        currency: a.currency,
        initialBalance: a.initialBalance,
        initialBalanceOn: a.initialBalanceOn.toISOString().slice(0, 10),
        active: a.active,
        balance: balances.get(a.id) ?? a.initialBalance,
        unreconciled: pendingMap.get(a.id) ?? 0,
      }))
    );
  } catch (e) {
    return failure(e, "banks GET");
  }
}

/** POST /api/billing/banks */
export async function POST(request: Request) {
  try {
    const session = await requireBilling("create");
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const on = typeof body.initialBalanceOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.initialBalanceOn) ? body.initialBalanceOn : null;
    const initial = body.initialBalance === "" || body.initialBalance === undefined ? 0 : num(body.initialBalance);
    if (!name) return Response.json({ error: "Escribe el nombre de la cuenta." }, { status: 400 });
    if (!on) return Response.json({ error: "Elige la fecha del saldo inicial." }, { status: 400 });
    if (!Number.isFinite(initial)) return Response.json({ error: "El saldo inicial no es un número válido." }, { status: 400 });
    const text = (v: unknown) => (typeof v === "string" ? v.trim() || null : null);
    const created = await prisma.bankAccount.create({
      data: {
        name,
        bank: text(body.bank),
        accountNumber: text(body.accountNumber),
        currency: String(body.currency ?? "").toUpperCase() === "USD" ? "USD" : "MXN",
        initialBalance: initial,
        initialBalanceOn: toDate(on),
      },
      select: { id: true },
    });
    void logAudit({ resource: "bank_account", resourceId: created.id, resourceLabel: name, action: "created", userId: session.user.id, userName: session.user.name });
    return Response.json({ id: created.id }, { status: 201 });
  } catch (e) {
    return failure(e, "banks POST");
  }
}
