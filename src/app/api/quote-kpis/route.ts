import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireModuleAccess } from "@/lib/module-access";
import { computeQuoteKpis, monthKey, monthRange, type KpiQuote } from "@/lib/quote-kpis";

export const dynamic = "force-dynamic";

const PERIODS = { month: 1, "3m": 3, "6m": 6, "12m": 12 } as const;
type Period = keyof typeof PERIODS | "ytd" | "all";

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Inicio de un mes en Ciudad de México (UTC-6, sin horario de verano). */
const monthStart = (key: string) => new Date(`${key}-01T06:00:00.000Z`);

function readRows(rows: Prisma.JsonValue): KpiQuote["rows"] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((r) => {
    if (!r || typeof r !== "object" || Array.isArray(r)) return [];
    const o = r as Record<string, unknown>;
    return [
      {
        origin: String(o.origin ?? ""),
        destination: String(o.destination ?? ""),
        unitLabel: String(o.unitLabel ?? ""),
        cost: Number(o.cost) || 0,
      },
    ];
  });
}

/**
 * GET /api/quote-kpis?period=3m&kind=all&user=
 * period: month | 3m | 6m | 12m | ytd | all · kind: all | terrestre | maritima
 */
export async function GET(request: Request) {
  try {
    await requireModuleAccess("QuoteKpis", "view");
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") ?? "6m") as Period;
    const kind = searchParams.get("kind") ?? "all";
    const user = searchParams.get("user") || null;

    const now = new Date();
    const current = monthKey(now);
    let from: string;
    if (period === "all") {
      const [g, m] = await Promise.all([
        prisma.generatedQuote.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
        prisma.maritimeQuote.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      ]);
      const first = [g?.createdAt, m?.createdAt].filter(Boolean).sort((a, b) => a!.getTime() - b!.getTime())[0];
      from = first ? monthKey(first) : current;
    } else if (period === "ytd") {
      from = `${current.slice(0, 4)}-01`;
    } else {
      from = shiftMonth(current, -((PERIODS[period as keyof typeof PERIODS] ?? 6) - 1));
    }
    const since = monthStart(from);
    const byUser = user ? { createdById: user } : {};

    const [ground, maritime, creators] = await Promise.all([
      kind === "maritima"
        ? []
        : prisma.generatedQuote.findMany({
            where: { createdAt: { gte: since }, ...byUser },
            select: {
              status: true,
              validUntil: true,
              createdAt: true,
              createdById: true,
              company: true,
              rows: true,
              rejectionReason: true,
              createdBy: { select: { name: true } },
            },
          }),
      kind === "terrestre"
        ? []
        : prisma.maritimeQuote.findMany({
            where: { createdAt: { gte: since }, ...byUser },
            select: {
              status: true,
              validUntil: true,
              createdAt: true,
              createdById: true,
              client: true,
              rejectionReason: true,
              createdBy: { select: { name: true } },
            },
          }),
      prisma.user.findMany({
        where: { OR: [{ generatedQuotes: { some: {} } }, { maritimeQuotes: { some: {} } }] },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const quotes: KpiQuote[] = [
      ...ground.map((q) => ({
        kind: "terrestre" as const,
        status: q.status,
        validUntil: q.validUntil,
        createdAt: q.createdAt,
        createdById: q.createdById,
        createdByName: q.createdBy?.name ?? "—",
        company: q.company,
        rows: readRows(q.rows),
        rejectionReason: q.rejectionReason,
      })),
      ...maritime.map((q) => ({
        kind: "maritima" as const,
        status: q.status,
        validUntil: q.validUntil,
        createdAt: q.createdAt,
        createdById: q.createdById,
        createdByName: q.createdBy?.name ?? "—",
        company: q.client,
        rows: [],
        rejectionReason: q.rejectionReason,
      })),
    ];

    const kpis = computeQuoteKpis(quotes, now, monthRange(from, current));
    return Response.json({ from, to: current, users: creators, ...kpis });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[quote-kpis] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
