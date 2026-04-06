/** Normaliza el arreglo enviado desde el cliente (POST/PATCH). */
export function parseClientProductTypes(raw: unknown): string[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((s) => String(s).trim()).filter(Boolean))];
}
