export const IDEA_CATEGORIES = [
  "Procesos",
  "Tecnología",
  "Cultura",
  "Operaciones",
  "Clientes",
  "Otro",
] as const;

export type IdeaCategory = (typeof IDEA_CATEGORIES)[number];

export const IDEA_STATUS_LABELS: Record<string, string> = {
  pending:  "Pendiente",
  accepted: "Aceptada",
  rejected: "Rechazada",
};

export const IDEA_STATUS_COLORS: Record<string, string> = {
  pending:  "bg-amber-100 text-amber-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export const IDEA_CATEGORY_COLORS: Record<string, string> = {
  "Procesos":    "bg-blue-100 text-blue-700",
  "Tecnología":  "bg-blue-200 text-blue-900",
  "Cultura":     "bg-green-100 text-green-700",
  "Operaciones": "bg-amber-100 text-amber-700",
  "Clientes":    "bg-blue-50 text-blue-700 border border-blue-200",
  "Otro":        "bg-slate-100 text-slate-600",
};
