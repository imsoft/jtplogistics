export interface Finance {
  id: string;
  eco: string | null;
  client: string | null;
  origin: string | null;
  destination: string | null;
  sale: number | null;
  product: string | null;
  pickupDate: string | null;
  deliveryDate: string | null;
  legalName: string | null;
  cost: number | null;
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

/** Fila de la tabla de finanzas: un embarque + tarifas del registro financiero si existe. `id` = id del embarque. */
export interface FinanceListRow {
  id: string;
  shipmentId: string;
  financeId: string | null;
  status: string;
  eco: string | null;
  client: string | null;
  origin: string | null;
  destination: string | null;
  sale: number | null;
  cost: number | null;
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

/** Detalle en `/finances/[id]` donde `id` es el embarque. */
export type FinanceShipmentDetail = FinanceListRow;

export interface FinanceFormData {
  eco: string;
  client: string;
  origin: string;
  destination: string;
  sale: string;
  product: string;
  pickupDate: string;
  deliveryDate: string;
  legalName: string;
  cost: string;
  operatorName: string;
  truck: string;
  trailer: string;
  unit: string;
  phone: string;
  comments: string;
  incident: string;
  incidentType: string;
}
