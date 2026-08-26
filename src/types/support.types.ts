import type { TICKET_STATUS_LABELS } from "@/lib/support";

/** Reporte de equipo tal como lo devuelve /api/support/tickets al que lo abrió. */
export interface SupportTicketRow {
  id: string;
  title: string;
  description: string;
  status: keyof typeof TICKET_STATUS_LABELS;
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
  laptop: { name: string } | null;
  phone: { name: string } | null;
}
