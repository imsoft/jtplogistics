/**
 * Resumen de Administración para el inicio, lado servidor: lo junta de
 * facturas, cuentas de banco y movimientos del mes.
 */

import { prisma } from "@/lib/db";
import { companyDateKey } from "@/lib/time-clock";
import { r2 } from "@/lib/billing";
import { APPLIED_SELECT, appliedOf, bankBalances, toDate } from "@/lib/billing-server";
import { summarizeBilling } from "@/lib/billing-overview";

/** `null` si todavía no hay cuentas ni facturas: no hay nada que resumir. */
export async function loadBillingOverview() {
  const today = companyDateKey();
  const [docs, accounts, balances, unreconciled, movements] = await Promise.all([
    prisma.billingDocument.findMany({
      where: { cancelledAt: null },
      select: { kind: true, dueDate: true, currency: true, total: true, draft: true, ...APPLIED_SELECT },
    }),
    prisma.bankAccount.findMany({ where: { active: true }, select: { id: true, currency: true } }),
    bankBalances(),
    prisma.bankMovement.groupBy({ by: ["bankAccountId"], where: { reconciled: false }, _count: { _all: true } }),
    prisma.bankMovement.findMany({
      where: { date: { gte: toDate(`${today.slice(0, 7)}-01`), lte: toDate(today) } },
      select: { date: true, amount: true, bankAccount: { select: { currency: true } } },
    }),
  ]);
  if (docs.length === 0 && accounts.length === 0) return null;
  const pending = new Map(unreconciled.map((u) => [u.bankAccountId, u._count._all]));
  return summarizeBilling(
    docs.map((d) => ({
      kind: d.kind,
      dueDate: d.dueDate.toISOString().slice(0, 10),
      currency: d.currency,
      balance: d.draft ? 0 : r2(d.total - appliedOf(d).applied),
      draft: d.draft,
    })),
    accounts.map((a) => ({ currency: a.currency, balance: balances.get(a.id) ?? 0, unreconciled: pending.get(a.id) ?? 0 })),
    movements.map((m) => ({ currency: m.bankAccount.currency, date: m.date.toISOString().slice(0, 10), amount: m.amount })),
    today
  );
}
