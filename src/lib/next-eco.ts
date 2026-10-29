/**
 * Siguiente número de ECO: el más alto que exista más uno, con el mismo
 * formato ("J - 16353" → "J - 16354"). Puro, para poder probarlo.
 */
export function nextEco(ecos: (string | null | undefined)[]): string {
  let best: { n: number; prefix: string; width: number } | null = null;
  for (const raw of ecos) {
    const m = (raw ?? "").trim().match(/^(.*?)(\d+)\s*$/);
    if (!m) continue;
    const n = Number(m[2]);
    if (!best || n > best.n) best = { n, prefix: m[1], width: m[2].length };
  }
  if (!best) return "J - 1";
  // El prefijo se normaliza al formato de siempre: letra en mayúscula y " - ".
  const prefix = best.prefix.replace(/^\s*(eco\s*)?/i, "").replace(/\s*-\s*$/, "").trim().toUpperCase() || "J";
  return `${prefix} - ${String(best.n + 1).padStart(best.width, "0")}`;
}
