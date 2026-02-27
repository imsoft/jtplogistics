import type { RouteStatus } from "@/types/route.types";

export const ROUTE_STATUS_LABELS: Record<RouteStatus, string> = {
  active: "Activa",
  inactive: "Inactiva",
  pending: "Pendiente",
};

export const ROUTE_STATUS_OPTIONS: { value: RouteStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "active", label: "Activa" },
  { value: "inactive", label: "Inactiva" },
];
