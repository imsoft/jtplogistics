/**
 * KPIs de cotizaciones: embudo, tasa de cierre, montos y desgloses por
 * colaborador, cliente, ruta y motivo de rechazo.
 *
 * Puro y sin base de datos, para poder probarlo. La API arma la lista de
 * cotizaciones (terrestres y marítimas) ya filtrada por periodo y la pasa aquí.
 *
 * Reglas:
 *  - Los borradores no cuentan como emitidas: todavía no le llegaron al cliente.
 *  - "Vencida" se calcula igual que en la tabla: enviada o en negociación
 *    después de su vigencia.
 *  - Tasa de cierre = aceptadas ÷ emitidas.
 *  - El monto es la suma de las tarifas de la cotización terrestre. La
 *    marítima no tiene una tarifa de venta comparable (calcula impuestos y
 *    gastos de importación), así que cuenta en el embudo pero no en montos.
 */

export type KpiQuoteStatus = "borrador" | "enviada" | "negociacion" | "aceptada" | "rechazada";
export type KpiDisplayStatus = KpiQuoteStatus | "vencida";
export type KpiQuoteKind = "terrestre" | "maritima";

export interface KpiQuoteRow {
  origin: string;
  destination: string;
  unitLabel: string;
  cost: number;
}

export interface KpiQuote {
  kind: KpiQuoteKind;
  status: KpiQuoteStatus;
  validUntil: Date;
  createdAt: Date;
  createdById: string;
  createdByName: string;
  company: string;
  /** Solo terrestres; las marítimas van vacías. */
  rows: KpiQuoteRow[];
  rejectionReason: string | null;
}

export const KPI_TIME_ZONE = "America/Mexico_City";

/** Mismo criterio que getQuoteDisplayStatus, con "ahora" explícito. */
export function kpiDisplayStatus(q: Pick<KpiQuote, "status" | "validUntil">, now: Date): KpiDisplayStatus {
  if (q.status === "enviada" || q.status === "negociacion") {
    const limit = new Date(q.validUntil);
    limit.setHours(23, 59, 59, 999);
    if (limit.getTime() < now.getTime()) return "vencida";
  }
  return q.status;
}

/** "YYYY-MM" de una fecha en la zona de la empresa. */
export function monthKey(date: Date, timeZone = KPI_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit" }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  return `${y}-${m}`;
}

/** Todos los meses entre dos "YYYY-MM", inclusive. */
export function monthRange(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
    if (out.length > 120) break;
  }
  return out;
}

/** Para agrupar "Grupo Bimbo ", "GRUPO BIMBO" y "grupo bimbo" como uno solo. */
export function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function quoteAmount(q: KpiQuote): number | null {
  if (q.kind !== "terrestre") return null;
  return q.rows.reduce((sum, r) => sum + (Number.isFinite(r.cost) ? r.cost : 0), 0);
}

const rate = (part: number, total: number) => (total > 0 ? part / total : 0);

export interface QuoteKpis {
  totals: {
    emitted: number;
    drafts: number;
    accepted: number;
    rejected: number;
    expired: number;
    open: number;
    closeRate: number;
    quotedAmount: number;
    wonAmount: number;
    avgTicket: number;
  };
  funnel: { status: Exclude<KpiDisplayStatus, "borrador">; count: number }[];
  monthly: { month: string; emitted: number; accepted: number; quotedAmount: number; wonAmount: number }[];
  byUser: {
    userId: string;
    name: string;
    emitted: number;
    accepted: number;
    closeRate: number;
    quotedAmount: number;
    wonAmount: number;
  }[];
  byClient: { name: string; emitted: number; accepted: number; closeRate: number; wonAmount: number }[];
  byRoute: { route: string; unit: string; timesQuoted: number; timesWon: number; avgCost: number }[];
  rejectionReasons: { reason: string; count: number }[];
}

export function computeQuoteKpis(
  quotes: KpiQuote[],
  now: Date,
  months: string[],
  limits: { clients?: number; routes?: number } = {}
): QuoteKpis {
  const emittedQuotes = quotes.filter((q) => q.status !== "borrador");
  const drafts = quotes.length - emittedQuotes.length;

  const funnelCounts: Record<string, number> = { enviada: 0, negociacion: 0, aceptada: 0, rechazada: 0, vencida: 0 };
  const monthly = new Map(months.map((m) => [m, { month: m, emitted: 0, accepted: 0, quotedAmount: 0, wonAmount: 0 }]));
  const byUser = new Map<string, QuoteKpis["byUser"][number]>();
  const byClient = new Map<string, QuoteKpis["byClient"][number] & { latest: number }>();
  const byRoute = new Map<string, { route: string; unit: string; timesQuoted: number; timesWon: number; costSum: number }>();
  const reasons = new Map<string, number>();

  let quotedAmount = 0;
  let wonAmount = 0;
  let amountQuotes = 0;

  for (const q of emittedQuotes) {
    const display = kpiDisplayStatus(q, now);
    funnelCounts[display] = (funnelCounts[display] ?? 0) + 1;
    const won = q.status === "aceptada";
    const amount = quoteAmount(q);
    if (amount !== null) {
      quotedAmount += amount;
      amountQuotes++;
      if (won) wonAmount += amount;
    }

    const m = monthly.get(monthKey(q.createdAt));
    if (m) {
      m.emitted++;
      if (won) m.accepted++;
      if (amount !== null) {
        m.quotedAmount += amount;
        if (won) m.wonAmount += amount;
      }
    }

    const u = byUser.get(q.createdById) ?? {
      userId: q.createdById,
      name: q.createdByName,
      emitted: 0,
      accepted: 0,
      closeRate: 0,
      quotedAmount: 0,
      wonAmount: 0,
    };
    u.emitted++;
    if (won) u.accepted++;
    if (amount !== null) {
      u.quotedAmount += amount;
      if (won) u.wonAmount += amount;
    }
    byUser.set(q.createdById, u);

    const clientKey = normalizeKey(q.company);
    if (clientKey) {
      const c = byClient.get(clientKey) ?? { name: q.company.trim(), emitted: 0, accepted: 0, closeRate: 0, wonAmount: 0, latest: 0 };
      c.emitted++;
      if (won) c.accepted++;
      if (won && amount !== null) c.wonAmount += amount;
      // El nombre que se muestra es el de la cotización más reciente.
      if (q.createdAt.getTime() >= c.latest) {
        c.latest = q.createdAt.getTime();
        c.name = q.company.trim();
      }
      byClient.set(clientKey, c);
    }

    for (const r of q.rows) {
      const key = `${normalizeKey(r.origin)}|${normalizeKey(r.destination)}|${normalizeKey(r.unitLabel)}`;
      const route = byRoute.get(key) ?? {
        route: `${r.origin.trim()} → ${r.destination.trim()}`,
        unit: r.unitLabel.trim(),
        timesQuoted: 0,
        timesWon: 0,
        costSum: 0,
      };
      route.timesQuoted++;
      if (won) route.timesWon++;
      route.costSum += Number.isFinite(r.cost) ? r.cost : 0;
      byRoute.set(key, route);
    }

    if (q.status === "rechazada") {
      const key = q.rejectionReason ?? "sin_motivo";
      reasons.set(key, (reasons.get(key) ?? 0) + 1);
    }
  }

  const accepted = funnelCounts.aceptada;
  const emitted = emittedQuotes.length;

  return {
    totals: {
      emitted,
      drafts,
      accepted,
      rejected: funnelCounts.rechazada,
      expired: funnelCounts.vencida,
      open: funnelCounts.enviada + funnelCounts.negociacion,
      closeRate: rate(accepted, emitted),
      quotedAmount,
      wonAmount,
      avgTicket: amountQuotes > 0 ? quotedAmount / amountQuotes : 0,
    },
    funnel: (["enviada", "negociacion", "aceptada", "rechazada", "vencida"] as const).map((status) => ({
      status,
      count: funnelCounts[status],
    })),
    monthly: [...monthly.values()],
    byUser: [...byUser.values()]
      .map((u) => ({ ...u, closeRate: rate(u.accepted, u.emitted) }))
      .sort((a, b) => b.emitted - a.emitted || b.accepted - a.accepted),
    byClient: [...byClient.values()]
      .map((c) => ({ name: c.name, emitted: c.emitted, accepted: c.accepted, wonAmount: c.wonAmount, closeRate: rate(c.accepted, c.emitted) }))
      .sort((a, b) => b.emitted - a.emitted || b.accepted - a.accepted)
      .slice(0, limits.clients ?? 10),
    byRoute: [...byRoute.values()]
      .map(({ costSum, ...r }) => ({ ...r, avgCost: r.timesQuoted > 0 ? costSum / r.timesQuoted : 0 }))
      .sort((a, b) => b.timesQuoted - a.timesQuoted || b.timesWon - a.timesWon)
      .slice(0, limits.routes ?? 10),
    rejectionReasons: [...reasons.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
  };
}
