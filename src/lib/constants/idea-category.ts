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
  pending:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  accepted: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export const IDEA_CATEGORY_COLORS: Record<string, string> = {
  "Procesos":    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "Tecnología":  "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "Cultura":     "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  "Operaciones": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "Clientes":    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Otro":        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};
