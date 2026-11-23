/**
 * Cotizadores que comparten la misma pantalla y tabla: el nacional y el
 * internacional. Por ahora el internacional es una copia del nacional con sus
 * propias cotizaciones; se irá ajustando según lo defina el cliente.
 */
export type QuoteScope = "nacional" | "internacional";

export const QUOTE_SCOPE_LABELS: Record<QuoteScope, string> = {
  nacional: "Cotizador nacional",
  internacional: "Cotizador internacional",
};

/** Lo que llega de un body o query; cualquier otra cosa es nacional. */
export function parseQuoteScope(v: unknown): QuoteScope {
  return v === "internacional" ? "internacional" : "nacional";
}

/** Carpeta de las pantallas de cada cotizador dentro del panel. */
const SEGMENT: Record<QuoteScope, string> = { nacional: "quotes", internacional: "international-quotes" };

/** Listado del cotizador en ese panel, p. ej. /admin/dashboard/international-quotes. */
export function quotesBase(panel: "admin" | "collaborator", scope: QuoteScope): string {
  return `/${panel}/dashboard/${SEGMENT[scope]}`;
}

/** El cotizador de la pantalla actual, según su URL. */
export function quoteScopeFromPath(pathname: string): QuoteScope {
  return pathname.includes(`/${SEGMENT.internacional}`) ? "internacional" : "nacional";
}
