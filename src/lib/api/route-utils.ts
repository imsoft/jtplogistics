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
  createdById: string | null;
  createdBy: { id: string; name: string } | null;
  createdAt: Date;
  unitTargets?: { unitType: string; target: number | null }[];
};

export const VALID_STATUSES: RouteStatus[] = ["active", "inactive", "pending"];

export function routeToJson(r: PrismaRoute) {
  const targets =
    r.unitTargets && r.unitTargets.length > 0
      ? r.unitTargets.map((ut) => ({
          unitType: ut.unitType as UnitType,
          target: ut.target ?? undefined,
        }))
      : [{ unitType: r.unitType as UnitType, target: r.target ?? undefined }];

  return {
    id: r.id,
    origin: r.origin,
    destination: r.destination,
    destinationState: r.destinationState ?? undefined,
    description: r.description ?? undefined,
    target: r.target ?? undefined,
    weeklyVolume: r.weeklyVolume ?? undefined,
    unitType: r.unitType as UnitType,
    unitTargets: targets,
    status: r.status as RouteStatus,
    createdByName: r.createdBy?.name ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}
