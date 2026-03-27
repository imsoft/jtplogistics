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
  incident: string | null;
  incidentType: string | null;
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
  incident: string;
  incidentType: string;
}
