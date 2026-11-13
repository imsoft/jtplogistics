/**
 * Evaluaciones de un proveedor: la calificación general y la de cada mes,
 * calculadas con sus embarques más el ajuste y comentario de JTP. La usan el
 * rating de admin y "Mis evaluaciones" del proveedor.
 */

import { prisma } from "@/lib/db";
import { finalStars, monthLabel, scoreShipments, scoreToStars, shipmentMonth, type ScoreStats } from "@/lib/carrier-evaluation";

export interface MonthEvaluation {
  month: string;
  label: string;
  stats: ScoreStats | null;
  autoStars: number | null;
  /** Ajuste de JTP para ese mes. */
  manualStars: number | null;
  /** La que cuenta: el ajuste si lo hay; si no, la automática. */
  stars: number | null;
  comment: string | null;
  ratedByName: string | null;
  updatedAt: string | null;
}

export interface CarrierEvaluations {
  legalName: string;
  overall: {
    stats: ScoreStats | null;
    autoStars: number | null;
    manualStars: number | null;
    stars: number | null;
    notes: string | null;
  };
  months: MonthEvaluation[];
}

/** Las evaluaciones de una razón social (sin distinguir mayúsculas), del mes más reciente al más viejo. */
export async function evaluationsFor(legalName: string): Promise<CarrierEvaluations> {
  const name = legalName.trim();
  const [shipments, manual, monthly] = await Promise.all([
    prisma.shipment.findMany({
      where: { legalName: { equals: name, mode: "insensitive" } },
      select: { status: true, deliveryOutcome: true, incident: true, pickupDate: true, deliveryDate: true, createdAt: true },
    }),
    prisma.carrierManualRating.findFirst({ where: { legalName: { equals: name, mode: "insensitive" } } }),
    prisma.carrierMonthlyEvaluation.findMany({
      where: { legalName: { equals: name, mode: "insensitive" } },
      include: { ratedBy: { select: { name: true } } },
    }),
  ]);

  const byMonth = new Map<string, typeof shipments>();
  for (const s of shipments) {
    const key = shipmentMonth(s);
    byMonth.set(key, [...(byMonth.get(key) ?? []), s]);
  }
  const evalByMonth = new Map(monthly.map((m) => [m.month, m]));
  const keys = [...new Set([...byMonth.keys(), ...evalByMonth.keys()])].sort().reverse();

  const months: MonthEvaluation[] = keys.map((month) => {
    const stats = scoreShipments(byMonth.get(month) ?? []);
    const autoStars = stats ? scoreToStars(stats.overallScore) : null;
    const e = evalByMonth.get(month);
    return {
      month,
      label: monthLabel(month),
      stats,
      autoStars,
      manualStars: e?.stars ?? null,
      stars: finalStars(autoStars, e?.stars ?? null),
      comment: e?.comment ?? null,
      ratedByName: e?.ratedBy?.name ?? null,
      updatedAt: e?.updatedAt.toISOString() ?? null,
    };
  });

  const overallStats = scoreShipments(shipments);
  const overallAuto = overallStats ? scoreToStars(overallStats.overallScore) : null;
  return {
    legalName: name,
    overall: {
      stats: overallStats,
      autoStars: overallAuto,
      manualStars: manual?.stars ?? null,
      stars: finalStars(overallAuto, manual?.stars ?? null),
      notes: manual?.notes ?? null,
    },
    months,
  };
}
