/**
 * Server-side helper to create route audit log entries.
 * Fire-and-forget: errors are logged but never thrown.
 */
import { prisma } from "@/lib/db";

export type RouteAction = "created" | "updated" | "deleted";

export interface RouteSnapshot {
  origin?: string;
  destination?: string;
  destinationState?: string | null;
  description?: string | null;
  target?: number | null;
  weeklyVolume?: number | null;
  unitType?: string;
  status?: string;
}

export interface RouteChangeDiff {
  field: string;
  label: string;
  from: string | null;
  to: string | null;
}

const FIELD_LABELS: Record<string, string> = {
  origin:           "Origen",
  destination:      "Destino",
  destinationState: "Estado destino",
  description:      "Descripción",
  target:           "Target",
  weeklyVolume:     "Vol./semana",
  unitType:         "Tipo de unidad",
  status:           "Estado",
};

const STATUS_LABELS: Record<string, string> = {
  active:   "Activa",
  inactive: "Inactiva",
  pending:  "Pendiente",
};

function formatValue(field: string, val: unknown): string | null {
  if (val == null || val === "") return null;
  if (field === "target") return `$${Number(val).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
  if (field === "status") return STATUS_LABELS[String(val)] ?? String(val);
  return String(val);
}

export function diffSnapshots(before: RouteSnapshot, after: RouteSnapshot): RouteChangeDiff[] {
  const fields = Object.keys(FIELD_LABELS) as (keyof RouteSnapshot)[];
  return fields
    .filter((f) => {
      const bv = before[f] ?? null;
      const av = after[f] ?? null;
      return String(bv) !== String(av);
    })
    .map((f) => ({
      field: f,
      label: FIELD_LABELS[f],
      from: formatValue(f, before[f] ?? null),
      to: formatValue(f, after[f] ?? null),
    }));
}

interface LogRouteParams {
  routeId: string;
  routeLabel: string;
  action: RouteAction;
  userId: string;
  userName: string;
  changes?: RouteChangeDiff[];
  snapshot?: RouteSnapshot;
}

export async function logRoute({
  routeId,
  routeLabel,
  action,
  userId,
  userName,
  changes,
  snapshot,
}: LogRouteParams) {
  try {
    await prisma.routeLog.create({
      data: {
        routeId,
        routeLabel,
        action,
        userId,
        userName,
        changes: changes ? JSON.stringify(changes) : null,
        snapshot: snapshot ? JSON.stringify(snapshot) : null,
      },
    });
  } catch (e) {
    console.error("[route-log] Error writing log:", e);
  }
}
