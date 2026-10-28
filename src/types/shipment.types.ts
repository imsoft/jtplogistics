export type ShipmentStatus =
  | "pending"
  | "in_transit"
  | "delivered"
  | "delivered_with_delay"
  | "not_delivered"
  | "at_risk"
  | "returned";

export interface Shipment {
  id: string;
  eco: string | null;
  client: string | null;
  origin: string | null;
  destination: string | null;
  product: string | null;
  pickupDate: string | null;
  deliveryDate: string | null;
  legalName: string | null;
  operatorName: string | null;
  truck: string | null;
  trailer: string | null;
  unit: string | null;
  phone: string | null;
  comments: string | null;
  originAddress?: string | null;
  destinationAddress?: string | null;
  extraCosts?: { concept: string; sale: number | null; cost: number | null }[];
  incident: string | null;
  incidentType: string | null;
  status: ShipmentStatus;
  /** Tarifas en pesos. Ausentes si quien consulta no puede ver Finanzas. */
  sale?: number | null;
  cost?: number | null;
  /** Cómo terminó la entrega; se conserva al cerrar. */
  deliveryOutcome?: string | null;
  createdAt: string;
}

export interface ShipmentFormData {
  eco: string;
  client: string;
  origin: string;
  destination: string;
  product: string;
  pickupDate: string;
  deliveryDate: string;
  legalName: string;
  operatorName: string;
  truck: string;
  trailer: string;
  unit: string;
  phone: string;
  comments: string;
  originAddress: string;
  destinationAddress: string;
  incident: string;
  incidentType: string;
  status: ShipmentStatus;
  /** Solo los manda quien puede capturar tarifas. */
  sale?: string;
  cost?: string;
  extraCosts?: { concept: string; sale: string; cost: string }[];
}
