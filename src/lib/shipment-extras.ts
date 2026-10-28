/**
 * Costos extra de un embarque (maniobras, estadías, casetas…). Cada uno lleva
 * lo que se le cobra al cliente (venta) y lo que se le paga al transportista
 * (compra), y se suman a la tarifa base de cada lado.
 *
 * Puro, para poder probarlo.
 */

// `type` y no `interface`: así Prisma lo acepta como JSON.
export type ExtraCost = {
  concept: string;
  sale: number | null;
  cost: number | null;
};

const money = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
};

/** Lo que venga (JSON de la BD o del formulario) → lista limpia; descarta renglones vacíos. */
export function readExtraCosts(value: unknown): ExtraCost[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      return { concept: typeof o.concept === "string" ? o.concept.trim() : "", sale: money(o.sale), cost: money(o.cost) };
    })
    .filter((x) => x.concept || x.sale != null || x.cost != null)
    .slice(0, 30);
}

/** Error de captura, o null si la lista está bien. */
export function extraCostsError(list: ExtraCost[]): string | null {
  const blank = list.find((x) => !x.concept);
  if (blank) return "Cada costo extra necesita su concepto.";
  return null;
}

export function extrasSum(list: ExtraCost[]): { sale: number; cost: number } {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return {
    sale: r2(list.reduce((s, x) => s + (x.sale ?? 0), 0)),
    cost: r2(list.reduce((s, x) => s + (x.cost ?? 0), 0)),
  };
}

/** Tarifa base + extras de un lado. Sin base ni extras, no hay tarifa. */
export function withExtras(base: number | null | undefined, extra: number): number | null {
  if (base == null && extra === 0) return null;
  return Math.round(((base ?? 0) + extra) * 100) / 100;
}
