export const CARRIER_SUGGESTION_STATUSES = ["pending", "in_review", "resolved", "rejected"] as const;

export type CarrierSuggestionStatus = (typeof CARRIER_SUGGESTION_STATUSES)[number];

export const CARRIER_SUGGESTION_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  in_review: "En revisión",
  resolved: "Resuelta",
  rejected: "Rechazada",
};

export const CARRIER_SUGGESTION_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  in_review: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  resolved: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
  rejected: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};
