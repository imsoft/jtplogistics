import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";

export interface RouteMargin {
  route: string;
  origin: string;
  destination: string;
  totalSale: number;
  totalCost: number;
  margin: number;
  count: number;
}

export interface LegalNameCount {
  legalName: string;
  count: number;
}

export interface FinancesAnalytics {
  routeMargins: RouteMargin[];
  legalNameCounts: LegalNameCount[];
}

export function GET() {
  return adminHandler(async () => {
    const records = await prisma.finance.findMany({
      select: {
        origin: true,
        destination: true,
        sale: true,
        cost: true,
        legalName: true,
      },
    });

    // --- Margen por ruta ---
    const routeMap = new Map<string, { origin: string; destination: string; totalSale: number; totalCost: number; count: number }>();
    for (const r of records) {
      const origin = r.origin?.trim() || "";
      const destination = r.destination?.trim() || "";
      if (!origin && !destination) continue;

      const key = `${origin}|||${destination}`;
      const existing = routeMap.get(key) ?? { origin, destination, totalSale: 0, totalCost: 0, count: 0 };
      existing.totalSale += r.sale ?? 0;
      existing.totalCost += r.cost ?? 0;
      existing.count += 1;
      routeMap.set(key, existing);
    }

    const routeMargins: RouteMargin[] = Array.from(routeMap.values())
      .map((v) => ({
        route: `${v.origin} → ${v.destination}`,
        origin: v.origin,
        destination: v.destination,
        totalSale: v.totalSale,
        totalCost: v.totalCost,
        margin: v.totalSale - v.totalCost,
        count: v.count,
      }))
      .sort((a, b) => b.margin - a.margin);

    // --- Razón social con más embarques ---
    const legalMap = new Map<string, number>();
    for (const r of records) {
      const name = r.legalName?.trim() || "";
      if (!name) continue;
      legalMap.set(name, (legalMap.get(name) ?? 0) + 1);
    }

    const legalNameCounts: LegalNameCount[] = Array.from(legalMap.entries())
      .map(([legalName, count]) => ({ legalName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return Response.json({ routeMargins, legalNameCounts } satisfies FinancesAnalytics);
  });
}
