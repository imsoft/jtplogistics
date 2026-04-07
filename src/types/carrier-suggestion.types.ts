export interface CarrierSuggestion {
  id: string;
  title: string;
  description: string | null;
  status: string;
  carrierId: string;
  carrierName?: string;
  carrierEmail?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CarrierSuggestionFormData {
  title: string;
  description: string;
}
