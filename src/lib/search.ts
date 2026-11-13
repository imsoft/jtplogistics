import { formatPhone, formatPhoneLive, formatPlates, formatPlatesLive } from "@/lib/phone-plates";

/**
 * Normalizes a string for fuzzy search:
 * - Removes diacritics/accents (á→a, é→e, ñ→n, ü→u, etc.)
 * - Converts to lowercase
 * - Trims whitespace
 */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Checks if `haystack` contains `needle` after normalizing both.
 */
export function fuzzyMatch(haystack: string, needle: string): boolean {
  const h = normalizeSearch(haystack);
  const n = normalizeSearch(needle);
  if (h.includes(n)) return true;
  // Teléfonos y placas van con guiones: "3334109866" encuentra "33-3410-9866".
  const bare = (s: string) => s.replace(/[-\s]/g, "");
  return Boolean(bare(n)) && bare(h).includes(bare(n));
}

/**
 * Lo que se busca en la base de datos: el texto tal cual y, si trae números,
 * también con guiones de teléfono y de placa. Así "3334109866" encuentra
 * "33-3410-9866" y "02az1a" encuentra "02-AZ-1A".
 */
export function searchTerms(q: string): string[] {
  const t = q.trim();
  if (!/\d/.test(t) || !/^[\w\s\-+().]+$/.test(t)) return [t];
  return [...new Set([t, formatPhone(t), formatPhoneLive(t), formatPlates(t), formatPlatesLive(t)].filter(Boolean))];
}
