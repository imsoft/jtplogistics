export interface Route {
  id: string;
  origin: string;
  destination: string;
  destinationState?: string;
  description?: string;
  target?: number;
  weeklyVolume?: number;
  unitType: UnitType;
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
  status: RouteStatus;
}
