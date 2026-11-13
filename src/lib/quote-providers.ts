/**
 * Proveedores con los que se cotizó: reglas puras para poder probarlas.
 */

export const QUOTE_PROVIDER_MAX_NAME = 120;

export interface QuoteProviderInput {
  carrierId: string | null;
  name: string;
  amount: number;
  routeIndex: number | null;
}

/** Valida lo que llega del formulario. `routes` es cuántas rutas tiene la cotización. */
export function readQuoteProvider(body: Record<string, unknown>, routes: number): QuoteProviderInput | { error: string } {
  const carrierId = typeof body.carrierId === "string" && body.carrierId.trim() ? body.carrierId.trim() : null;
  const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  if (!carrierId && name.length < 2) return { error: "Elige un proveedor o escribe su nombre." };
  if (name.length > QUOTE_PROVIDER_MAX_NAME) return { error: "El nombre es muy largo." };
  const amount = typeof body.amount === "number" ? body.amount : Number(String(body.amount ?? "").replace(/[$,\s]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Escribe el precio del proveedor." };
  let routeIndex: number | null = null;
  if (body.routeIndex !== undefined && body.routeIndex !== null && body.routeIndex !== "") {
    const n = Number(body.routeIndex);
    if (!Number.isInteger(n) || n < 0 || n >= routes) return { error: "La ruta no es válida." };
    routeIndex = n;
  }
  return { carrierId, name, amount: Math.round(amount * 100) / 100, routeIndex };
}

/**
 * Margen contra el precio al cliente: el de su ruta o, si la cotización
 * tiene una sola, el de esa. Sin ruta clara no hay margen.
 */
export function providerMargin(amount: number, routeIndex: number | null, routePrices: number[]): { margin: number; pct: number } | null {
  const price = routeIndex !== null ? routePrices[routeIndex] : routePrices.length === 1 ? routePrices[0] : undefined;
  if (!price || price <= 0) return null;
  const margin = Math.round((price - amount) * 100) / 100;
  return { margin, pct: Math.round((margin / price) * 1000) / 10 };
}
