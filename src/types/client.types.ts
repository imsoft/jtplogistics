export interface Client {
  id: string;
  name: string;
  contactName: string | null;
  position: string | null;
  legalName: string | null;
  rfc: string | null;
  /** Datos para facturar (CFDI 4.0). */
  taxRegime?: string | null;
  fiscalZip?: string | null;
  cfdiUse?: string | null;
  /** Días de crédito para calcular el vencimiento de sus facturas. */
  creditDays?: number | null;
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
  taxRegime: string;
  fiscalZip: string;
  cfdiUse: string;
  creditDays: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  detentionConditions: string;
  productTypes: string[];
}
