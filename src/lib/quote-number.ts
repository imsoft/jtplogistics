/**
 * Número consecutivo de las cotizaciones: JTP-DDMMAAAA-NNN.
 *
 * El consecutivo es CORRIDO: nunca se reinicia. Antes se calculaba por día y,
 * como casi siempre se hace una cotización diaria, todas terminaban en 001 y
 * parecía que no había consecutivo. La fecha del número sigue siendo la del
 * día en que se generó; lo que ya no depende del día es el contador.
 *
 * Sale del MAYOR número ya usado, no de cuántas cotizaciones hay: contando, al
 * borrar una el número se repetía y el guardado chocaba contra el índice único,
 * dejando el consecutivo congelado.
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

/**
 * El siguiente consecutivo a partir de los números ya emitidos. Se queda fuera
 * de la consulta para poder probarlo: es la parte que se ha roto dos veces.
 */
export function nextSuffix(usedNumbers: string[]): number {
  let max = 0;
  for (const number of usedNumbers) {
    const n = Number.parseInt(number.slice(number.lastIndexOf("-") + 1), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}
