/**
 * Recordatorio diario de Administración: qué está vencido o por vencer en
 * cobranza y qué hay que pagar a transportistas y proveedores en la semana.
 * Un solo aviso por persona al día, no uno por factura.
 *
 * Puro, para poder probarlo. Las fechas son "YYYY-MM-DD".
 */

import { r2, type BillingKind, type Currency } from "@/lib/billing";
import { formatMxn } from "@/lib/utils";

export interface ReminderDocument {
  kind: BillingKind;
  dueDate: string;
  currency: Currency;
  balance: number;
}

type Sums = Record<Currency, number>;

export interface ReminderBucket {
  count: number;
  amounts: Sums;
}

export interface BillingDigest {
  receivableOverdue: ReminderBucket;
  receivableDueSoon: ReminderBucket;
  payableDue: ReminderBucket;
}

/** Cuántos días antes se avisa que una factura por cobrar va a vencer. */
export const RECEIVABLE_NOTICE_DAYS = 3;
/** Ventana de pagos: lo vencido y lo que vence en los próximos 7 días. */
export const PAYABLE_WINDOW_DAYS = 7;

export function addDaysKey(key: string, days: number) {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Lunes a viernes: el fin de semana no se manda. */
export function isWeekday(key: string) {
  const day = new Date(`${key}T12:00:00Z`).getUTCDay();
  return day !== 0 && day !== 6;
}

const empty = (): ReminderBucket => ({ count: 0, amounts: { MXN: 0, USD: 0 } });
const add = (b: ReminderBucket, d: ReminderDocument) => {
  b.count += 1;
  b.amounts[d.currency] = r2(b.amounts[d.currency] + d.balance);
};

/** Solo facturas con saldo (ni borradores ni canceladas: esas ya llegan con saldo 0). */
export function buildDigest(docs: ReminderDocument[], today: string): BillingDigest {
  const soon = addDaysKey(today, RECEIVABLE_NOTICE_DAYS);
  const week = addDaysKey(today, PAYABLE_WINDOW_DAYS);
  const digest: BillingDigest = { receivableOverdue: empty(), receivableDueSoon: empty(), payableDue: empty() };
  for (const d of docs) {
    if (d.balance <= 0.01) continue;
    if (d.kind === "receivable") {
      if (d.dueDate < today) add(digest.receivableOverdue, d);
      else if (d.dueDate <= soon) add(digest.receivableDueSoon, d);
    } else if (d.dueDate <= week) {
      add(digest.payableDue, d);
    }
  }
  return digest;
}

/** "$1,200.00 MXN y $50.00 USD" */
export function formatSums(s: Sums) {
  return (["MXN", "USD"] as Currency[])
    .filter((c) => s[c] > 0)
    .map((c) => `$${formatMxn(s[c])} ${c}`)
    .join(" y ");
}

const facturas = (n: number) => `${n} ${n === 1 ? "factura" : "facturas"}`;
const vencidas = (n: number) => (n === 1 ? "1 factura vencida" : `${n} facturas vencidas`);
const vencen = (n: number) => (n === 1 ? "1 factura vence" : `${n} facturas vencen`);
const porVencer = (n: number) => `${facturas(n)} por vencer`;

/** Los avisos del día: uno de cobranza y uno de pagos, solo si hay algo. */
export function digestMessages(d: BillingDigest): { kind: BillingKind; title: string; body: string }[] {
  const out: { kind: BillingKind; title: string; body: string }[] = [];
  const { receivableOverdue: over, receivableDueSoon: soon, payableDue: pay } = d;
  if (over.count || soon.count) {
    const parts: string[] = [];
    if (over.count) parts.push(`${vencidas(over.count)} por ${formatSums(over.amounts)}`);
    if (soon.count) parts.push(`${vencen(soon.count)} en los próximos ${RECEIVABLE_NOTICE_DAYS} días por ${formatSums(soon.amounts)}`);
    out.push({
      kind: "receivable",
      title: `Cobranza: ${over.count ? vencidas(over.count) : porVencer(soon.count)}`,
      body: `${parts.join("; ")}.`,
    });
  }
  if (pay.count) {
    out.push({
      kind: "payable",
      title: `Pagos de la semana: ${facturas(pay.count)}`,
      body: `A transportistas y proveedores, vencidas o por vencer en ${PAYABLE_WINDOW_DAYS} días: ${formatSums(pay.amounts)}.`,
    });
  }
  return out;
}
