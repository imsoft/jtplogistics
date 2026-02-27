export interface ActiveRoute {
  id: string;
  origin: string;
  destination: string;
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
