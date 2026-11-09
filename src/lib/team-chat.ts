/**
 * Chat entre colaboradores: reglas puras (sin base de datos) para poder
 * probarlas.
 */

export const TEAM_CHAT_MAX_BODY = 4000;
export const TEAM_CHAT_MAX_NAME = 60;

/** La conversación directa entre dos personas es una sola, sin importar quién escribe primero. */
export function directKey(a: string, b: string): string {
  return [a, b].sort().join(":");
}

/** Texto del mensaje listo para guardar, o el error a mostrar. */
export function cleanMessageBody(raw: unknown): { body: string } | { error: string } {
  const body = typeof raw === "string" ? raw.trim() : "";
  if (!body) return { error: "Escribe un mensaje." };
  if (body.length > TEAM_CHAT_MAX_BODY) return { error: `El mensaje es muy largo (máximo ${TEAM_CHAT_MAX_BODY} caracteres).` };
  return { body };
}

/** Nombre de grupo listo para guardar, o el error a mostrar. */
export function cleanGroupName(raw: unknown): { name: string } | { error: string } {
  const name = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
  if (name.length < 2) return { error: "Ponle nombre al grupo." };
  if (name.length > TEAM_CHAT_MAX_NAME) return { error: `El nombre es muy largo (máximo ${TEAM_CHAT_MAX_NAME} caracteres).` };
  return { name };
}

/** Ids únicos y sin vacíos. */
export function uniqueIds(raw: unknown): string[] {
  return Array.isArray(raw) ? [...new Set(raw.filter((x): x is string => typeof x === "string" && x.trim() !== ""))] : [];
}

/** Iniciales para el avatar: "Isabel Huerta" → "IH". */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
