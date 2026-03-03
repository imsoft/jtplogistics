import type { RouteStatus, UnitType } from "@/types/route.types";

export type PrismaRoute = {
  id: string;
  origin: string;
  destination: string;
  destinationState: string | null;
  description: string | null;
  target: number | null;
  weeklyVolume: number | null;
  unitType: string;
  status: string;
  createdAt: Date;
};

export const VALID_UNIT_TYPES: UnitType[] = ["dry_box"];
export const VALID_STATUSES: RouteStatus[] = ["active", "inactive", "pending"];

export function routeToJson(r: PrismaRoute) {
  return {
    id: r.id,
    origin: r.origin,
    destination: r.destination,
    destinationState: r.destinationState ?? undefined,
    description: r.description ?? undefined,
    target: r.target ?? undefined,
    weeklyVolume: r.weeklyVolume ?? undefined,
    unitType: r.unitType as UnitType,
    status: r.status as RouteStatus,
    createdAt: r.createdAt.toISOString(),
  };
}
