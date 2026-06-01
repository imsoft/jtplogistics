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
  pending:  "bg-yellow-100 text-yellow-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export const IDEA_CATEGORY_COLORS: Record<string, string> = {
  "Procesos":    "bg-blue-100 text-blue-700",
  "Tecnología":  "bg-violet-100 text-violet-700",
  "Cultura":     "bg-pink-100 text-pink-700",
  "Operaciones": "bg-amber-100 text-amber-700",
  "Clientes":    "bg-emerald-100 text-emerald-700",
  "Otro":        "bg-slate-100 text-slate-600",
};
