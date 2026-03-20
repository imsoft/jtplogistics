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
  return normalizeSearch(haystack).includes(normalizeSearch(needle));
}
