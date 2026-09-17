/**
 * Días programados que cambian cómo se juzga la jornada de una persona:
 * vacaciones, home office, incapacidad y permiso.
 *
 * Puro y sin base de datos, para poder probarlo.
 */

export type LeaveKind = "vacaciones" | "home_office" | "incapacidad" | "permiso";

export const LEAVE_KINDS: { value: LeaveKind; label: string; hint: string }[] = [
  {
    value: "vacaciones",
    label: "Vacaciones",
    hint: "No trabaja. Si aun así marca, no se le anota nada.",
  },
  {
    value: "home_office",
    label: "Home office",
    hint: "Trabaja desde donde esté, con su horario y sus retardos de siempre.",
  },
  {
    value: "incapacidad",
    label: "Incapacidad",
    hint: "No trabaja. Se distingue de vacaciones en el registro.",
  },
  {
    value: "permiso",
    label: "Permiso",
    hint: "Ausencia autorizada. No trabaja.",
  },
];

export const LEAVE_LABELS: Record<LeaveKind, string> = Object.fromEntries(
  LEAVE_KINDS.map((k) => [k.value, k.label])
) as Record<LeaveKind, string>;

/**
 * Si ese día sigue contando como día de trabajo.
 *
 * Solo el home office: la persona trabaja, nada más que desde otro lado, así
 * que se le cuenta retardo contra su horario y se le pide motivo si llega
 * tarde. En los otros tres no hay jornada que juzgar.
 */
export function isWorkingLeave(kind: LeaveKind): boolean {
  return kind === "home_office";
}

/** Dos periodos se encinman si uno empieza antes de que el otro termine. */
export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/** Las fechas de un rango, inclusive las dos: "2026-09-17" … "2026-09-19". */
export function eachDateKey(start: string, end: string): string[] {
  const out: string[] = [];
  const cursor = new Date(`${start}T00:00:00.000Z`);
  const last = new Date(`${end}T00:00:00.000Z`);
  // Tope de seguridad: un rango mal capturado no debe colgar la pantalla.
  while (cursor <= last && out.length < 1000) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

/** El periodo cubre ese día. */
export function coversDate(start: string, end: string, day: string): boolean {
  return start <= day && day <= end;
}
