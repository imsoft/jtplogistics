import type { LeadActivityType, LeadStage } from "@/lib/client-leads";

/** Un prospecto como lo devuelve /api/client-leads. */
export interface Lead {
  id: string;
  companyName: string;
  contactName: string | null;
  position: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  industry: string | null;
  rfc: string | null;
  address: string | null;
  source: string | null;
  stage: LeadStage;
  estimatedMonthly: number | null;
  notes: string | null;
  lostReason: string | null;
  nextAction: string | null;
  nextFollowUpOn: string | null;
  unitTypes: string[];
  ownerId: string | null;
  ownerName: string | null;
  clientId: string | null;
  clientName: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  lastActivity: { type: LeadActivityType; occurredOn: string; summary: string } | null;
}

export interface LeadActivity {
  id: string;
  type: LeadActivityType;
  summary: string;
  occurredOn: string;
  authorId: string | null;
  authorName: string | null;
  createdAt: string;
}

export interface LeadQuote {
  id: string;
  kind: "terrestre" | "maritima";
  number: string;
  status: "borrador" | "enviada" | "negociacion" | "aceptada" | "rechazada";
  validUntil: string;
  createdAt: string;
  createdByName: string | null;
  amount: number | null;
}

/** La ficha completa: /api/client-leads/[id]. */
export interface LeadDetail extends Lead {
  activities: LeadActivity[];
  quotes: LeadQuote[];
  canCreateClients: boolean;
}
