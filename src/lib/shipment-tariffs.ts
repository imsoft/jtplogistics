/**
 * Tarifas de un embarque: venta (precio al cliente) y compra (precio del
 * transportista). Se capturan en el embarque y, al cerrarlo, pasan al
 * registro de finanzas; la tabla de finanzas las lee de ahí.
 *
 * Las ven y editan dirección, soporte de TI y los colaboradores que ven
 * Finanzas. Se pueden capturar aunque el embarque esté bloqueado (cerrado o
 * sin incidencias): la tarifa suele confirmarse justo al cerrar.
 */

const TARIFF_KEYS = ["sale", "cost"] as const;
export type TariffKey = (typeof TARIFF_KEYS)[number];

/** "$25,000.50", 25000 o "" → número; "" / null → null; ausente → undefined. */
export function parseTariff(value: unknown): number | null | undefined | "invalid" {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0) return "invalid";
  return Math.round(n * 100) / 100;
}

/** Las tarifas que trae el cuerpo; error si alguna no es un número válido. */
export function readTariffs(
  body: Record<string, unknown>
): { ok: true; data: Partial<Record<TariffKey, number | null>> } | { ok: false; error: string } {
  const data: Partial<Record<TariffKey, number | null>> = {};
  for (const key of TARIFF_KEYS) {
    const v = parseTariff(body[key]);
    if (v === "invalid") {
      return { ok: false, error: `La tarifa de ${key === "sale" ? "venta" : "compra"} no es un número válido.` };
    }
    if (v !== undefined) data[key] = v;
  }
  return { ok: true, data };
}

/**
 * Si el cuerpo solo cambia tarifas. Es lo único que se deja guardar en un
 * embarque bloqueado sin confirmar el correo.
 */
export function isTariffOnlyBody(body: Record<string, unknown>): boolean {
  const keys = Object.keys(body).filter((k) => k !== "_confirmedEmail");
  return keys.length > 0 && keys.every((k) => (TARIFF_KEYS as readonly string[]).includes(k));
}

/** Quién puede ver y capturar tarifas. */
export function canManageTariffs(user: { role?: string | null }, me?: { canViewFinances?: boolean | null } | null): boolean {
  if (user.role === "admin" || user.role === "developer") return true;
  return user.role === "collaborator" && Boolean(me?.canViewFinances);
}

/** La tarifa que se muestra: la del embarque y, si no tiene, la del registro de finanzas. */
export function effectiveTariffs(
  shipment: { sale?: number | null; cost?: number | null },
  finance: { sale: number | null; cost: number | null } | null | undefined
): { sale: number | null; cost: number | null } {
  return {
    sale: shipment.sale ?? finance?.sale ?? null,
    cost: shipment.cost ?? finance?.cost ?? null,
  };
}

export const TARIFF_AUDIT_LABELS: Record<TariffKey, string> = {
  sale: "Tarifa de venta",
  cost: "Tarifa de compra",
};
