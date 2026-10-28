import type { RouteStatus } from "@/types/route.types";

export const ROUTE_STATUS_LABELS: Record<RouteStatus, string> = {
  active: "Activa",
  inactive: "Inactiva",
  pending: "Pendiente",
};

/** Colores de la paleta: activa = completo, pendiente = atención, inactiva = neutral. */
export const ROUTE_STATUS_BADGE: Record<RouteStatus, string> = {
  active: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
  inactive: "bg-gray-200 text-gray-700",
};

export const ROUTE_STATUS_OPTIONS: { value: RouteStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "active", label: "Activa" },
  { value: "inactive", label: "Inactiva" },
];
