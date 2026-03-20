export interface Client {
  id: string;
  name: string;
  legalName: string | null;
  rfc: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  detentionConditions: string | null;
  createdAt: string;
}

export interface ClientFormData {
  name: string;
  legalName: string;
  rfc: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  detentionConditions: string;
}
