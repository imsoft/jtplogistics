/**
 * Lo que comparten las vistas de rutas de un cliente en los dos paneles.
 * Sin "use client": también lo importan componentes de servidor si hace falta.
 */

export interface AssignedRoute {
  id: string;
  clientRouteId: string;
  origin: string;
  destination: string;
  destinationState: string | null;
  unitType: string;
  unitTargets: { unitType: string; target: number | null }[];
  target: number | null;
  weeklyVolume: number | null;
  clientTarget: number | null;
  clientWeeklyVolume: number | null;
  createdByName: string | null;
  status: string;
}

export const ROUTE_STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  inactive: "secondary",
  pending: "outline",
};

export function clientRoutesEndpoint(clientId: string) {
  return `/api/clients/${clientId}/routes`;
}

/** Agrupa las rutas por tipo de unidad conservando el orden de llegada. */
export function groupByUnitType<T extends { unitType: string }>(routes: T[]) {
  const grouped = new Map<string, T[]>();
  for (const r of routes) {
    const group = grouped.get(r.unitType) ?? [];
    group.push(r);
    grouped.set(r.unitType, group);
  }
  return Array.from(grouped.entries());
}
