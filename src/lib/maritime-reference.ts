/**
 * Folio de las cotizaciones marítimas: "AAAAMM-NN", consecutivo del mes en
 * hora de México. El consecutivo sale del mayor folio usado (no de contar):
 * contar repetía folios en cuanto se borraba una cotización.
 *
 * Puro, para poder probarlo.
 */

export function maritimeMonthPrefix(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit" }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  return `${y}${m}`;
}

export function nextMaritimeReference(used: string[], prefix: string): string {
  const max = used.reduce((top, ref) => {
    const m = ref.match(/^(\d{6})-(\d+)$/);
    return m && m[1] === prefix ? Math.max(top, Number(m[2])) : top;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(2, "0")}`;
}
