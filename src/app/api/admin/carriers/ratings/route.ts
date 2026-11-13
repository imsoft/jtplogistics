import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";
import { scoreShipments, scoreToStars } from "@/lib/carrier-evaluation";

export interface CarrierRating {
  legalName: string;
  totalShipments: number;
  delivered: number;
  deliveredWithDelay: number;
  notDelivered: number;
  inTransit: number; // pending, in_transit y at_risk
  withIncident: number;
  /** 0–100 | null if no closed shipments */
  punctualityScore: number | null;
  /** 0–100 */
  incidentFreeScore: number;
  /** 0–100 | null if no closed shipments */
  deliveryRateScore: number | null;
  /** 0–100 weighted overall */
  overallScore: number;
  /** 1–5 en medias (4.5) */
  stars: number;
  /** Calificación de JTP (1–5 en medias) | null si no se ha calificado */
  manualStars: number | null;
  manualNotes: string | null;
  manualRatedByName: string | null;
  /** ISO | null */
  manualRatedAt: string | null;
}

export function GET() {
  return adminHandler(async () => {
    const [shipments, manualRatings] = await Promise.all([
      prisma.shipment.findMany({
        where: { legalName: { not: null } },
        select: { legalName: true, status: true, deliveryOutcome: true, incident: true },
      }),
      prisma.carrierManualRating.findMany({
        select: { legalName: true, stars: true, notes: true, updatedAt: true, ratedBy: { select: { name: true } } },
      }),
    ]);

    const manualMap = new Map(manualRatings.map((m) => [m.legalName, m]));

    // Agrupados por razón social, igual que siempre.
    const byCarrier = new Map<string, typeof shipments>();
    for (const s of shipments) {
      const name = s.legalName!.trim();
      if (!name) continue;
      byCarrier.set(name, [...(byCarrier.get(name) ?? []), s]);
    }

    const ratings: CarrierRating[] = [];
    for (const [legalName, list] of byCarrier) {
      const stats = scoreShipments(list);
      if (!stats) continue;
      const manual = manualMap.get(legalName);
      ratings.push({
        legalName,
        totalShipments: stats.total,
        delivered: stats.delivered,
        deliveredWithDelay: stats.deliveredWithDelay,
        notDelivered: stats.notDelivered,
        inTransit: stats.inTransit,
        withIncident: stats.withIncident,
        punctualityScore: stats.punctualityScore,
        incidentFreeScore: stats.incidentFreeScore,
        deliveryRateScore: stats.deliveryRateScore,
        overallScore: stats.overallScore,
        stars: scoreToStars(stats.overallScore),
        manualStars: manual?.stars ?? null,
        manualNotes: manual?.notes ?? null,
        manualRatedByName: manual?.ratedBy?.name ?? null,
        manualRatedAt: manual?.updatedAt.toISOString() ?? null,
      });
    }

    ratings.sort((a, b) => b.overallScore - a.overallScore || b.totalShipments - a.totalShipments);
    return Response.json(ratings);
  });
}
