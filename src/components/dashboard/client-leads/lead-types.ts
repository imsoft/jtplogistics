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
  source: string | null;
  stage: LeadStage;
  estimatedMonthly: number | null;
  notes: string | null;
  lostReason: string | null;
  nextAction: string | null;
  nextFollowUpOn: string | null;
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

/** "YYYY-MM-DD" → "22 oct 26", sin que la zona del navegador mueva el día. */
export function shortDay(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

/** Hoy en la zona de la empresa, "YYYY-MM-DD". */
export function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
