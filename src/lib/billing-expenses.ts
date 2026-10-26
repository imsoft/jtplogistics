import type { Prisma } from "@prisma/client";
import { r2, type Currency, bankAmountFor } from "@/lib/billing";
import { num, toDate, upper } from "@/lib/billing-server";

/** Lee y valida un gasto. El total se recalcula: subtotal + IVA. */
export function readExpenseBody(body: Record<string, unknown>):
  | { ok: true; data: Omit<Prisma.ExpenseUncheckedCreateInput, "createdById"> }
  | { ok: false; error: string } {
  const date = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : null;
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const currency: Currency = upper(body.currency) === "USD" ? "USD" : "MXN";
  const exchangeRate = currency === "USD" ? num(body.exchangeRate) : 1;
  const subtotal = num(body.subtotal);
  const iva = body.iva === undefined || body.iva === "" ? 0 : num(body.iva);
  if (!date) return { ok: false, error: "Elige la fecha del gasto." };
  if (!category) return { ok: false, error: "Elige la categoría." };
  if (description.length < 3) return { ok: false, error: "Escribe en qué se gastó." };
  if (!Number.isFinite(subtotal) || subtotal <= 0) return { ok: false, error: "El importe debe ser mayor a cero." };
  if (!Number.isFinite(iva) || iva < 0) return { ok: false, error: "El IVA no es válido." };
  if (currency === "USD" && (!Number.isFinite(exchangeRate) || exchangeRate <= 0)) {
    return { ok: false, error: "Escribe el tipo de cambio." };
  }
  const text = (v: unknown) => (typeof v === "string" ? v.trim() || null : null);
  const uuid = text(body.uuid)?.toUpperCase() ?? null;
  return {
    ok: true,
    data: {
      date: toDate(date),
      category,
      providerName: text(body.providerName),
      description,
      currency,
      exchangeRate: currency === "USD" ? exchangeRate : 1,
      subtotal: r2(subtotal),
      iva: r2(iva),
      total: r2(subtotal + iva),
      uuid,
      bankAccountId: text(body.bankAccountId),
      notes: text(body.notes),
    },
  };
}

/** El movimiento de banco de un gasto pagado desde una cuenta: siempre sale. */
export function expenseMovement(
  e: { total: number; currency: Currency; exchangeRate: number; date: Date; category: string; description: string },
  accountCurrency: Currency
) {
  return {
    date: e.date,
    amount: -bankAmountFor(e.total, e.currency, accountCurrency, e.exchangeRate),
    concept: `Gasto · ${e.category} · ${e.description}`,
  };
}
