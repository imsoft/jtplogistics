/**
 * Resumen de Administración para el inicio, lado servidor: lo junta de
 * facturas, cuentas de banco y movimientos del mes.
 */

import { prisma } from "@/lib/db";
import { companyDateKey } from "@/lib/time-clock";
import { bankBalances, openDocumentBalances, toDate } from "@/lib/billing-server";
import { summarizeBilling } from "@/lib/billing-overview";

/** `null` si todavía no hay cuentas ni facturas: no hay nada que resumir. */
export async function loadBillingOverview() {
  const today = companyDateKey();
  const [docs, accounts, balances, unreconciled, movements] = await Promise.all([
    openDocumentBalances(),
    prisma.bankAccount.findMany({ where: { active: true }, select: { id: true, currency: true } }),
    bankBalances(),
    prisma.bankMovement.groupBy({ by: ["bankAccountId"], where: { reconciled: false }, _count: { _all: true } }),
    prisma.bankMovement.findMany({
      where: { date: { gte: toDate(`${today.slice(0, 7)}-01`), lte: toDate(today) } },
      select: { date: true, amount: true, bankAccount: { select: { currency: true } } },
    }),
  ]);
  if (docs.length === 0 && accounts.length === 0 && (await prisma.billingDocument.count({ where: { cancelledAt: null } })) === 0) return null;
  const pending = new Map(unreconciled.map((u) => [u.bankAccountId, u._count._all]));
  return summarizeBilling(
    docs.map((d) => ({ ...d, balance: d.draft ? 0 : d.balance })),
    accounts.map((a) => ({ currency: a.currency, balance: balances.get(a.id) ?? 0, unreconciled: pending.get(a.id) ?? 0 })),
    movements.map((m) => ({ currency: m.bankAccount.currency, date: m.date.toISOString().slice(0, 10), amount: m.amount })),
    today
  );
}
