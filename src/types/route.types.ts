export interface Route {
  id: string;
  origin: string;
  destination: string;
  destinationState?: string;
  description?: string;
  target?: number;
  weeklyVolume?: number;
  unitType: UnitType;
  /** Tipos de unidad y targets de la ruta (una sola fila en BD). */
  unitTargets?: Array<{ unitType: UnitType; target?: number }>;
  status: RouteStatus;
  createdByName?: string;
  createdAt: string;
}

export type RouteStatus = "active" | "inactive" | "pending";

export type UnitType = string;

export interface RouteFormData {
  origin: string;
  destination: string;
  destinationState: string;
  description: string;
  target?: number;
  weeklyVolume?: number;
  unitType: UnitType;
  unitTargets: Array<{ unitType: UnitType; target?: number }>;
  status: RouteStatus;
}
