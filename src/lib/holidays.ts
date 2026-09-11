/**
 * Días de descanso obligatorio de la Ley Federal del Trabajo (art. 74).
 *
 * Puro y sin base de datos, para poder probarlo. Solo cubre lo que se puede
 * calcular: la jornada electoral la fija la autoridad cada vez y se agrega a
 * mano desde la configuración del checador.
 */

export interface StatutoryHoliday {
  /** "YYYY-MM-DD" */
  date: string;
  name: string;
}

/** El n-ésimo lunes (o el día de la semana que se pida) de un mes. */
export function nthWeekday(year: number, month: number, weekday: number, n: number): string {
  // month es 1–12. Se trabaja en UTC para que la zona del servidor no mueva el día.
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  const day = 1 + offset + (n - 1) * 7;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function fixed(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Si ese año hay transmisión del Poder Ejecutivo. Desde la reforma que movió
 * la toma de posesión al 1 de octubre, cae en 2024, 2030, 2036…
 */
export function isInaugurationYear(year: number): boolean {
  return year >= 2024 && (year - 2024) % 6 === 0;
}

export function mexicanStatutoryHolidays(year: number): StatutoryHoliday[] {
  const MONDAY = 1;
  const days: StatutoryHoliday[] = [
    { date: fixed(year, 1, 1), name: "Año Nuevo" },
    { date: nthWeekday(year, 2, MONDAY, 1), name: "Día de la Constitución" },
    { date: nthWeekday(year, 3, MONDAY, 3), name: "Natalicio de Benito Juárez" },
    { date: fixed(year, 5, 1), name: "Día del Trabajo" },
    { date: fixed(year, 9, 16), name: "Día de la Independencia" },
    { date: nthWeekday(year, 11, MONDAY, 3), name: "Día de la Revolución" },
    { date: fixed(year, 12, 25), name: "Navidad" },
  ];
  if (isInaugurationYear(year)) {
    days.push({ date: fixed(year, 10, 1), name: "Transmisión del Poder Ejecutivo" });
  }
  return days.sort((a, b) => a.date.localeCompare(b.date));
}
