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
  bulkImported?: boolean;
  createdAt: Date;
  unitTargets?: { unitType: string; target: number | null }[];
};

export const VALID_STATUSES: RouteStatus[] = ["active", "inactive", "pending"];

/** Etiqueta de las rutas que llegaron por carga masiva sin dueño elegido. */
export const BULK_IMPORT_LABEL = "Carga masiva";

/**
 * Quién se muestra como creador de una ruta. En una carga masiva el usuario
 * guardado es quien subió el archivo, no quien hizo la ruta: se muestra
 * "Carga masiva" para no atribuírsela.
 */
export function routeCreatorName(r: { bulkImported?: boolean | null; createdBy?: { name: string } | null }): string | null {
  if (r.bulkImported) return BULK_IMPORT_LABEL;
  return r.createdBy?.name ?? null;
}

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
    createdByName: routeCreatorName(r) ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}
