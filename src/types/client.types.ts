export interface Client {
  id: string;
  name: string;
  contactName: string | null;
  position: string | null;
  legalName: string | null;
  rfc: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  detentionConditions: string | null;
  productTypes: string[];
  createdAt: string;
}

export interface ClientFormData {
  name: string;
  contactName: string;
  position: string;
  legalName: string;
  rfc: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  detentionConditions: string;
  productTypes: string[];
}
