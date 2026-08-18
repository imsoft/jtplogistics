import type { RouteStatus } from "@/types/route.types";

/**
 * Ruta disponible en el cotizador. Se incluyen todas las rutas registradas
 * (activas, pendientes e inactivas); `status` permite avisar en la interfaz
 * cuando la ruta elegida no está activa.
 */
export interface ActiveRoute {
  id: string;
  origin: string;
  destination: string;
  destinationState: string | null;
  unitType: string;
  target: number | null;
  status?: RouteStatus;
}

export interface CarrierQuote {
  id: string;
  carrierId: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  carrierTarget: number | null;
}

export interface CarrierQuotesResponse {
  routes: ActiveRoute[];
  carriers: CarrierQuote[];
}

export interface QuoteRow {
  origin: string;
  destination: string;
  destinationState: string | null;
  cost: number;
  unitLabel: string;
}

export interface QuoteData {
  quoteNumber: string;
  company: string;
  contact: string;
  phone: string;
  /** Correo del contacto. Opcional: las cotizaciones viejas no lo tienen. */
  email?: string;
  validUntil: string;
  rows: QuoteRow[];
}
