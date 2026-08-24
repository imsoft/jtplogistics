import { prisma } from "@/lib/db";

/**
 * Número consecutivo de las cotizaciones: JTP-DDMMAAAA-NNN.
 *
 * El consecutivo sale del MAYOR número ya usado ese día, no de cuántas hay:
 * contando, al borrar una cotización el número se repetía y el guardado
 * chocaba contra el índice único, dejando el consecutivo congelado.
 */

/** "24082026" del día indicado, en la zona horaria de la empresa. */
export function quoteDayKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")}${get("month")}${get("year")}`;
}

export function quoteNumberPrefix(date = new Date()): string {
  return `JTP-${quoteDayKey(date)}-`;
}

/** Siguiente número libre del día. */
export async function nextQuoteNumber(date = new Date()): Promise<string> {
  const prefix = quoteNumberPrefix(date);
  const used = await prisma.generatedQuote.findMany({
    where: { quoteNumber: { startsWith: prefix } },
    select: { quoteNumber: true },
  });

  let max = 0;
  for (const { quoteNumber } of used) {
    const n = Number.parseInt(quoteNumber.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }

  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}
