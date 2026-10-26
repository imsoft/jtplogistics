/**
 * Resumen de Administración para el inicio: dinero en bancos, lo vencido por
 * cobrar, lo que hay que pagar en la semana y cómo va el flujo del mes.
 *
 * Puro, para poder probarlo. Las fechas son "YYYY-MM-DD".
 */

import { r2, type BillingKind, type Currency } from "@/lib/billing";
import { PAYABLE_WINDOW_DAYS, addDaysKey } from "@/lib/billing-reminders";

export type Sums = Record<Currency, number>;

export interface OverviewDocument {
  kind: BillingKind;
  dueDate: string;
  currency: Currency;
  /** Saldo pendiente (ya descontados cobros y notas de crédito). */
  balance: number;
  draft: boolean;
}

export interface OverviewAccount {
  currency: Currency;
  balance: number;
  unreconciled: number;
}

export interface OverviewMovement {
  currency: Currency;
  date: string;
  amount: number;
}

const zero = (): Sums => ({ MXN: 0, USD: 0 });
const add = (s: Sums, c: Currency, n: number) => {
  s[c] = r2(s[c] + n);
};

export function summarizeBilling(
  docs: OverviewDocument[],
  accounts: OverviewAccount[],
  movements: OverviewMovement[],
  today: string
) {
  const week = addDaysKey(today, PAYABLE_WINDOW_DAYS);
  const monthStart = `${today.slice(0, 7)}-01`;
  const out = {
    bank: zero(),
    unreconciled: 0,
    receivableOpen: zero(),
    receivableOverdue: zero(),
    receivableOverdueCount: 0,
    payableOpen: zero(),
    payableWeek: zero(),
    payableWeekCount: 0,
    monthIn: zero(),
    monthOut: zero(),
    drafts: 0,
  };
  for (const a of accounts) {
    add(out.bank, a.currency, a.balance);
    out.unreconciled += a.unreconciled;
  }
  for (const d of docs) {
    if (d.draft) {
      out.drafts += 1;
      continue;
    }
    if (d.balance <= 0.01) continue;
    if (d.kind === "receivable") {
      add(out.receivableOpen, d.currency, d.balance);
      if (d.dueDate < today) {
        add(out.receivableOverdue, d.currency, d.balance);
        out.receivableOverdueCount += 1;
      }
    } else {
      add(out.payableOpen, d.currency, d.balance);
      if (d.dueDate <= week) {
        add(out.payableWeek, d.currency, d.balance);
        out.payableWeekCount += 1;
      }
    }
  }
  for (const m of movements) {
    if (m.date < monthStart || m.date > today) continue;
    if (m.amount > 0) add(out.monthIn, m.currency, m.amount);
    else add(out.monthOut, m.currency, -m.amount);
  }
  return out;
}

export type BillingOverview = ReturnType<typeof summarizeBilling>;
