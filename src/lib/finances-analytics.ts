/**
 * Rentabilidad por ruta y transportistas con más embarques. Lo comparten la
 * vista de dirección y la del colaborador con permiso de Finanzas.
 */

import { prisma } from "@/lib/db";
import { findFinanceForShipment } from "@/lib/finance-shipment-match";
import { effectiveTariffs } from "@/lib/shipment-tariffs";

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
  /** Embarques con tarifa de venta y de compra: los únicos que entran al margen. */
  withTariffs: number;
  /** Embarques a los que les falta alguna tarifa y por eso no cuentan. */
  withoutTariffs: number;
}

export async function computeFinancesAnalytics(): Promise<FinancesAnalytics> {
  // Las tarifas se capturan en el embarque (abierto o cerrado); los registros
  // viejos de finanzas se usan si el embarque no las tiene.
  const [shipments, finances] = await Promise.all([
    prisma.shipment.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.finance.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  const all = shipments.map((sh) => ({
    origin: sh.origin,
    destination: sh.destination,
    legalName: sh.legalName,
    ...effectiveTariffs(sh, findFinanceForShipment(sh, finances)),
  }));
  // Sin las dos tarifas el margen sale falso (venta sin costo = 100 % de ganancia).
  const records = all.filter((r) => r.sale != null && r.cost != null);
  const withoutTariffs = all.length - records.length;

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
  for (const r of all) {
    const name = r.legalName?.trim() || "";
    if (!name) continue;
    legalMap.set(name, (legalMap.get(name) ?? 0) + 1);
  }

  const legalNameCounts: LegalNameCount[] = Array.from(legalMap.entries())
    .map(([legalName, count]) => ({ legalName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return { routeMargins, legalNameCounts, withTariffs: records.length, withoutTariffs };
}
