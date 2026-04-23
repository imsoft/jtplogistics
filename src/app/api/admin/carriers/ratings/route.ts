import { prisma } from "@/lib/db";
import { adminHandler } from "@/lib/api-handler";

export interface CarrierRating {
  legalName: string;
  totalShipments: number;
  delivered: number;
  deliveredWithDelay: number;
  notDelivered: number;
  inTransit: number; // pending + at_risk
  withIncident: number;
  /** 0–100 | null if no closed shipments */
  punctualityScore: number | null;
  /** 0–100 */
  incidentFreeScore: number;
  /** 0–100 | null if no closed shipments */
  deliveryRateScore: number | null;
  /** 0–100 weighted overall */
  overallScore: number;
  /** 1–5 */
  stars: number;
}

function toStars(score: number): number {
  if (score >= 90) return 5;
  if (score >= 75) return 4;
  if (score >= 58) return 3;
  if (score >= 38) return 2;
  return 1;
}

function hasIncident(value: string | null): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v !== "" && v !== "no";
}

export function GET() {
  return adminHandler(async () => {
    const shipments = await prisma.shipment.findMany({
      where: { legalName: { not: null } },
      select: {
        legalName: true,
        status: true,
        incident: true,
      },
    });

    // Group by legalName
    const map = new Map<string, {
      delivered: number;
      deliveredWithDelay: number;
      notDelivered: number;
      inTransit: number;
      withIncident: number;
      total: number;
    }>();

    for (const s of shipments) {
      const name = s.legalName!.trim();
      if (!name) continue;

      const entry = map.get(name) ?? {
        delivered: 0, deliveredWithDelay: 0, notDelivered: 0,
        inTransit: 0, withIncident: 0, total: 0,
      };

      entry.total += 1;
      if (s.status === "delivered") entry.delivered += 1;
      else if (s.status === "delivered_with_delay") entry.deliveredWithDelay += 1;
      else if (s.status === "not_delivered") entry.notDelivered += 1;
      else entry.inTransit += 1; // pending, at_risk, returned treated as in-transit for scoring

      if (hasIncident(s.incident)) entry.withIncident += 1;

      map.set(name, entry);
    }

    const ratings: CarrierRating[] = [];

    for (const [legalName, d] of map.entries()) {
      if (d.total === 0) continue;

      const closedShipments = d.delivered + d.deliveredWithDelay + d.notDelivered;

      // Punctuality: on-time full, with-delay half, not-delivered zero
      const punctualityScore = closedShipments > 0
        ? ((d.delivered + d.deliveredWithDelay * 0.5) / closedShipments) * 100
        : null;

      // Incident-free: % of total shipments without incident
      const incidentFreeScore = ((d.total - d.withIncident) / d.total) * 100;

      // Delivery rate: among closed, how many arrived (any form)
      const deliveryRateScore = closedShipments > 0
        ? ((d.delivered + d.deliveredWithDelay) / closedShipments) * 100
        : null;

      // Weighted overall — if no closed shipments, weight incident score fully
      let overallScore: number;
      if (punctualityScore !== null && deliveryRateScore !== null) {
        overallScore = punctualityScore * 0.4 + incidentFreeScore * 0.3 + deliveryRateScore * 0.3;
      } else {
        overallScore = incidentFreeScore;
      }

      ratings.push({
        legalName,
        totalShipments: d.total,
        delivered: d.delivered,
        deliveredWithDelay: d.deliveredWithDelay,
        notDelivered: d.notDelivered,
        inTransit: d.inTransit,
        withIncident: d.withIncident,
        punctualityScore: punctualityScore !== null ? Math.round(punctualityScore) : null,
        incidentFreeScore: Math.round(incidentFreeScore),
        deliveryRateScore: deliveryRateScore !== null ? Math.round(deliveryRateScore) : null,
        overallScore: Math.round(overallScore),
        stars: toStars(overallScore),
      });
    }

    // Sort: most shipments first within same star tier, then by score
    ratings.sort((a, b) => b.overallScore - a.overallScore || b.totalShipments - a.totalShipments);

    return Response.json(ratings);
  });
}
