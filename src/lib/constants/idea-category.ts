export const IDEA_CATEGORIES = [
  "Procesos",
  "Tecnología",
  "Cultura",
  "Operaciones",
  "Clientes",
  "Otro",
] as const;

export type IdeaCategory = (typeof IDEA_CATEGORIES)[number];
