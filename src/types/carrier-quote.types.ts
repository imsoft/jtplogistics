export interface ActiveRoute {
  id: string;
  origin: string;
  destination: string;
  destinationState: string | null;
  unitType: string;
  target: number | null;
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
  validUntil: string;
  rows: QuoteRow[];
}
