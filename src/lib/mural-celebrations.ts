/**
 * Cumpleaños y aniversarios del mural.
 * Este módulo es puro (sin acceso a BD) para poder probarse aislado; las
 * consultas viven en mural-celebrations-query.ts.
 *
 * No se capturan a mano: se derivan de `users.birth_date` (cumpleaños) y de
 * `employee_profiles.hire_date` (aniversario de ingreso). Todas las
 * comparaciones son en UTC para que la fecha no se recorra por zona horaria.
 */

import type { MuralCelebration } from "@/types/mural.types";

export interface CelebrationPerson {
  id: string;
  name: string;
  image: string | null;
  position: string | null;
  birthDate: Date | null;
  hireDate: Date | null;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Día UTC a medianoche, sin hora. */
export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

/**
 * Fecha en la que se celebra `origin` durante `year`. Los 29 de febrero se
 * celebran el 28 en los años no bisiestos.
 */
export function celebrationDateInYear(origin: Date, year: number): Date {
  const month = origin.getUTCMonth();
  const day = origin.getUTCDate();
  if (month === 1 && day === 29 && !isLeapYear(year)) {
    return new Date(Date.UTC(year, 1, 28));
  }
  return new Date(Date.UTC(year, month, day));
}

/**
 * Años cumplidos en la celebración. Devuelve null si el aniversario cae en el
 * mismo año de origen (es decir, aún no cumple ni un año).
 */
function yearsAt(origin: Date, celebration: Date): number | null {
  const years = celebration.getUTCFullYear() - origin.getUTCFullYear();
  return years > 0 ? years : null;
}

/**
 * Celebraciones que caen dentro de [from, to] (ambos inclusive, por día UTC).
 * Función pura: recibe la gente ya cargada para poder probarse sin BD.
 */
export function celebrationsInRange(
  people: CelebrationPerson[],
  from: Date,
  to: Date
): MuralCelebration[] {
  const start = startOfUtcDay(from);
  const end = startOfUtcDay(to);
  if (end < start) return [];

  const results: MuralCelebration[] = [];

  for (const person of people) {
    const sources: Array<{ kind: "birthday" | "anniversary"; origin: Date | null }> = [
      { kind: "birthday", origin: person.birthDate },
      { kind: "anniversary", origin: person.hireDate },
    ];

    for (const { kind, origin } of sources) {
      if (!origin) continue;
      // El rango puede cruzar el fin de año, así que se prueban ambos años.
      for (
        let year = start.getUTCFullYear();
        year <= end.getUTCFullYear();
        year++
      ) {
        const date = celebrationDateInYear(origin, year);
        if (date < start || date > end) continue;
        results.push({
          kind,
          userId: person.id,
          name: person.name,
          image: person.image,
          position: person.position,
          date: date.toISOString(),
          years: yearsAt(origin, date),
        });
      }
    }
  }

  return results.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}
