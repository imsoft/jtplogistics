/**
 * Reportes de Administración: estado de cuenta por cliente o proveedor, flujo
 * de efectivo y la exportación mensual para el contador.
 *
 * Puro y sin base de datos, para poder probarlo. Las fechas son "YYYY-MM-DD".
 */

import { daysOverdue, r2, type BillingKind, type Currency } from "@/lib/billing";

export interface ReportDocument {
  id: string;
  kind: BillingKind;
  partyName: string;
  partyRfc: string | null;
  series: string | null;
  folio: string | null;
  uuid: string | null;
  issueDate: string;
  dueDate: string;
  currency: Currency;
  exchangeRate: number;
  subtotal: number;
  iva: number;
  ivaWithheld: number;
  total: number;
  paymentMethod: string;
  concept: string | null;
  reference: string | null;
  draft: boolean;
  cancelled: boolean;
}

export interface ReportPayment {
  id: string;
  documentId: string;
  paidOn: string;
  amount: number;
  bankAccountName: string;
  bankAccountCurrency: Currency;
  bankAmount: number;
  exchangeRate: number;
  paymentForm: string | null;
  reference: string | null;
}

const folioOf = (d: { series: string | null; folio: string | null }) =>
  d.folio ? [d.series, d.folio].filter(Boolean).join("-") : "Borrador";

/** Lo que cuenta en saldos: ni borradores ni canceladas. */
const counts = (d: ReportDocument) => !d.draft && !d.cancelled;

// ── Estado de cuenta ─────────────────────────────────────────────────────────

export interface StatementLine {
  date: string;
  type: "factura" | "pago";
  folio: string;
  concept: string;
  /** Lo que aumenta el saldo (la factura). */
  charge: number;
  /** Lo que lo baja (el cobro o pago). */
  credit: number;
  balance: number;
}

export interface StatementOpenItem {
  folio: string;
  issueDate: string;
  dueDate: string;
  total: number;
  balance: number;
  daysOverdue: number;
}

export interface CurrencyStatement {
  currency: Currency;
  opening: number;
  charges: number;
  credits: number;
  closing: number;
  lines: StatementLine[];
  /** Facturas con saldo al cierre del periodo, la más vieja primero. */
  open: StatementOpenItem[];
}

/**
 * Estado de cuenta de un cliente o proveedor. Se separa por moneda: un saldo
 * en dólares no se suma con uno en pesos.
 */
export function buildStatement(
  docs: ReportDocument[],
  payments: ReportPayment[],
  from: string,
  to: string
): CurrencyStatement[] {
  const valid = docs.filter(counts);
  const byId = new Map(valid.map((d) => [d.id, d]));
  const pays = payments.filter((p) => byId.has(p.documentId));
  const label = (k: BillingKind) => (k === "receivable" ? "Cobro" : "Pago");

  const result: CurrencyStatement[] = [];
  for (const currency of ["MXN", "USD"] as Currency[]) {
    const cDocs = valid.filter((d) => d.currency === currency && d.issueDate <= to);
    if (cDocs.length === 0) continue;
    const cPays = pays.filter((p) => byId.get(p.documentId)!.currency === currency && p.paidOn <= to);

    const opening = r2(
      cDocs.filter((d) => d.issueDate < from).reduce((s, d) => s + d.total, 0) -
        cPays.filter((p) => p.paidOn < from).reduce((s, p) => s + p.amount, 0)
    );

    type Raw = Omit<StatementLine, "balance"> & { order: number };
    const raw: Raw[] = [
      ...cDocs
        .filter((d) => d.issueDate >= from)
        .map((d) => ({
          date: d.issueDate,
          type: "factura" as const,
          folio: folioOf(d),
          concept: d.concept ?? "Factura",
          charge: d.total,
          credit: 0,
          order: 0,
        })),
      ...cPays
        .filter((p) => p.paidOn >= from)
        .map((p) => {
          const d = byId.get(p.documentId)!;
          return {
            date: p.paidOn,
            type: "pago" as const,
            folio: folioOf(d),
            concept: `${label(d.kind)}${p.reference ? ` · ${p.reference}` : ""}`,
            charge: 0,
            credit: p.amount,
            order: 1,
          };
        }),
    ].sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order);

    let running = opening;
    const lines: StatementLine[] = raw.map((l) => {
      running = r2(running + l.charge - l.credit);
      return { date: l.date, type: l.type, folio: l.folio, concept: l.concept, charge: l.charge, credit: l.credit, balance: running };
    });

    const paidById = new Map<string, number>();
    for (const p of cPays) paidById.set(p.documentId, r2((paidById.get(p.documentId) ?? 0) + p.amount));
    const open = cDocs
      .map((d) => ({
        folio: folioOf(d),
        issueDate: d.issueDate,
        dueDate: d.dueDate,
        total: d.total,
        balance: r2(d.total - (paidById.get(d.id) ?? 0)),
        daysOverdue: daysOverdue(d.dueDate, to),
      }))
      .filter((o) => o.balance > 0.01)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    const charges = r2(lines.reduce((s, l) => s + l.charge, 0));
    const credits = r2(lines.reduce((s, l) => s + l.credit, 0));
    result.push({ currency, opening, charges, credits, closing: r2(opening + charges - credits), lines, open });
  }
  return result;
}

// ── Flujo de efectivo ────────────────────────────────────────────────────────

export interface CashAccount {
  id: string;
  name: string;
  bank: string | null;
  currency: Currency;
  initialBalance: number;
}

export interface CashMovement {
  bankAccountId: string;
  date: string;
  amount: number;
  concept: string;
  reference: string | null;
  /** De dónde viene: cobro, pago a proveedor, gasto (con su categoría) u otro. */
  source: "cobro" | "pago" | "gasto" | "otro";
  expenseCategory: string | null;
}

export interface CashFlowGroup {
  label: string;
  amount: number;
}

export interface AccountFlow {
  id: string;
  name: string;
  bank: string | null;
  currency: Currency;
  opening: number;
  inflows: number;
  outflows: number;
  closing: number;
}

export interface CurrencyFlow {
  currency: Currency;
  opening: number;
  inflows: number;
  outflows: number;
  net: number;
  closing: number;
  /** Entradas por origen (positivas) y salidas por destino (negativas). */
  inflowGroups: CashFlowGroup[];
  outflowGroups: CashFlowGroup[];
  accounts: AccountFlow[];
}

function groupLabel(m: CashMovement): string {
  if (m.source === "cobro") return "Cobros a clientes";
  if (m.source === "pago") return "Pagos a transportistas y proveedores";
  if (m.source === "gasto") return `Gastos · ${m.expenseCategory ?? "Otros"}`;
  return m.amount >= 0 ? "Otros ingresos" : "Otras salidas";
}

/**
 * Flujo de efectivo del periodo por moneda: saldo inicial, entradas y salidas
 * agrupadas, y el saldo final de cada cuenta.
 */
export function buildCashFlow(accounts: CashAccount[], movements: CashMovement[], from: string, to: string): CurrencyFlow[] {
  const result: CurrencyFlow[] = [];
  for (const currency of ["MXN", "USD"] as Currency[]) {
    const accs = accounts.filter((a) => a.currency === currency);
    if (accs.length === 0) continue;
    const ids = new Set(accs.map((a) => a.id));
    const moves = movements.filter((m) => ids.has(m.bankAccountId) && m.date <= to);
    const inPeriod = moves.filter((m) => m.date >= from);

    const accountFlows: AccountFlow[] = accs.map((a) => {
      const opening = r2(a.initialBalance + moves.filter((m) => m.bankAccountId === a.id && m.date < from).reduce((s, m) => s + m.amount, 0));
      const mine = inPeriod.filter((m) => m.bankAccountId === a.id);
      const inflows = r2(mine.filter((m) => m.amount > 0).reduce((s, m) => s + m.amount, 0));
      const outflows = r2(mine.filter((m) => m.amount < 0).reduce((s, m) => s - m.amount, 0));
      return { id: a.id, name: a.name, bank: a.bank, currency, opening, inflows, outflows, closing: r2(opening + inflows - outflows) };
    });

    const groups = new Map<string, number>();
    for (const m of inPeriod) groups.set(groupLabel(m), r2((groups.get(groupLabel(m)) ?? 0) + m.amount));
    const sorted = [...groups.entries()].map(([label, amount]) => ({ label, amount }));

    const sum = (k: "opening" | "inflows" | "outflows" | "closing") => r2(accountFlows.reduce((s, a) => s + a[k], 0));
    const inflows = sum("inflows");
    const outflows = sum("outflows");
    result.push({
      currency,
      opening: sum("opening"),
      inflows,
      outflows,
      net: r2(inflows - outflows),
      closing: sum("closing"),
      inflowGroups: sorted.filter((g) => g.amount > 0).sort((a, b) => b.amount - a.amount),
      outflowGroups: sorted.filter((g) => g.amount < 0).sort((a, b) => a.amount - b.amount),
      accounts: accountFlows,
    });
  }
  return result;
}

// ── Periodos ─────────────────────────────────────────────────────────────────

/** Primer y último día del mes de una fecha "YYYY-MM-DD" o "YYYY-MM". */
export function monthRange(key: string): { from: string; to: string } {
  const [y, m] = key.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(last).padStart(2, "0")}` };
}

export function isDateKey(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export { folioOf as reportFolio };
