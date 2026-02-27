/**
 * Helpers de normalización para datos que se persisten en BD.
 * Ver /docs/conventions.md para reglas completas.
 */

/**
 * Normaliza un email: trim + minúsculas.
 * Usar siempre antes de guardar o comparar emails.
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (email == null || typeof email !== "string") return "";
  return email.trim().toLowerCase();
}

/**
 * Normaliza un username/handle: trim + minúsculas + sin espacios internos.
 * Debe ser único en BD (case-insensitive).
 */
export function normalizeUsername(username: string | null | undefined): string {
  if (username == null || typeof username !== "string") return "";
  return username
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

/**
 * Genera un slug: minúsculas, guiones, sin acentos ni caracteres especiales.
 * Para URLs y identificadores legibles.
 */
export function slugify(text: string | null | undefined): string {
  if (text == null || typeof text !== "string") return "";
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Normaliza nombres visibles (first_name, last_name, company_name, etc.):
 * trim + colapsar espacios múltiples. NO forzar minúsculas.
 */
export function normalizeDisplayName(name: string | null | undefined): string {
  if (name == null || typeof name !== "string") return "";
  return name.trim().replace(/\s+/g, " ");
}
