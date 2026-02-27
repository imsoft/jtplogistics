import type { RouteStatus, UnitType } from "@/types/route.types";

export type PrismaRoute = {
  id: string;
  origin: string;
  destination: string;
  description: string | null;
  target: number | null;
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
    description: r.description ?? undefined,
    target: r.target ?? undefined,
    unitType: r.unitType as UnitType,
    status: r.status as RouteStatus,
    createdAt: r.createdAt.toISOString(),
  };
}
