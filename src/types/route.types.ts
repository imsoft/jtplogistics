export interface Route {
  id: string;
  origin: string;
  destination: string;
  description?: string;
  target?: number;
  unitType: UnitType;
  status: RouteStatus;
  createdAt: string;
}

export type RouteStatus = "active" | "inactive" | "pending";

export type UnitType = "dry_box";

export interface RouteFormData {
  origin: string;
  destination: string;
  description: string;
  target?: number;
  unitType: UnitType;
  status: RouteStatus;
}
