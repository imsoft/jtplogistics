/**
 * Precios que ve el vendedor. Él no ve los targets de los transportistas ni el
 * de la ruta: el servidor los convierte en el precio sugerido y en el resumen
 * de su comisión, y solo eso sale al navegador.
 *
 * Puro y sin base de datos, para poder probarlo.
 */

/** Margen de JTP sobre el costo en el cotizador: costo más un 30 %. */
export const QUOTE_MARKUP = 1.3;

const r2 = (n: number) => Math.round(n * 100) / 100;

function average(values: number[]) {
  const ok = values.filter((v) => Number.isFinite(v));
  return ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : null;
}

/**
 * Precio sugerido de la cotización: el promedio de lo que cotizaron los
 * transportistas o, si nadie la ha cotizado, el target de la ruta; más el margen.
 */
export function suggestedQuotePrice(carrierTargets: number[], routeTarget: number | null) {
  const base = average(carrierTargets) ?? routeTarget;
  return base != null && base > 0 ? r2(base * QUOTE_MARKUP) : null;
}

/** Resumen del cotizador del vendedor (venta, total con IVA y su comisión del 3 %). */
export function vendorCommissionSummary(carrierTargets: number[]) {
  const avg = average(carrierTargets);
  if (avg == null) return null;
  const venta = avg * 1.25;
  const monto = venta * 1.16;
  return { venta: r2(venta), monto: r2(monto), comision: r2(monto * 0.03) };
}
