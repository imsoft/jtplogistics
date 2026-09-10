/**
 * Las reglas que juzgan una jornada. Puras y sin base de datos, para poder
 * probarlas: aquí es donde se decide si alguien llegó tarde y si eso ya se
 * volvió una falta.
 *
 * Las reglas acordadas con el cliente:
 *   · Entrada con 10 minutos de tolerancia. Pasando eso es retardo y hay que
 *     escribir el motivo en el momento.
 *   · Comida de una hora, también con 10 minutos de tolerancia. Pasando el
 *     minuto 70 hay que escribir el motivo.
 *   · 3 retardos hacen 1 falta, y esos 3 se consumen.
 *   · 3 faltas dentro de 30 días marcan prospecto a baja.
 *   · Todo caduca a los 30 días, en ventana rodante.
 */

/** Minutos de gracia, iguales para la entrada y para el regreso de comida. */
export const TOLERANCE_MIN = 10;

/** La hora de comida, pareja para todos los turnos. */
export const LUNCH_MIN = 60;

/** Retardos que hacen una falta. */
export const RETARDOS_PER_FALTA = 3;

/** Faltas vivas que marcan prospecto a baja. */
export const FALTAS_FOR_PROSPECTO = 3;

/** Días que vive cada anotación antes de caducar sola. */
export const INCIDENT_LIFE_DAYS = 30;

/**
 * Qué tan tarde llegó, en minutos. Negativo si llegó antes.
 *
 * Los dos valores son minutos desde la medianoche, así que hay que cerrar el
 * círculo: quien entra a las 22:00 y marca a las 00:05 no llegó 1315 minutos
 * temprano, llegó 65 tarde. Todo lo que caiga a más de 12 horas de distancia
 * se interpreta como el otro lado del reloj.
 */
export function minutesLate(scheduledStart: number, markedMinute: number): number {
  const diff = (markedMinute - scheduledStart + 1440) % 1440;
  return diff <= 720 ? diff : diff - 1440;
}

export function isRetardo(scheduledStart: number, markedMinute: number): boolean {
  return minutesLate(scheduledStart, markedMinute) > TOLERANCE_MIN;
}

/** Minutos que duró la comida entre las dos marcas. */
export function lunchMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

export function isLunchTooLong(minutes: number): boolean {
  return minutes > LUNCH_MIN + TOLERANCE_MIN;
}

/**
 * Si la marca necesita que el colaborador escriba un motivo.
 *
 * Es la regla que cierra el hueco del aviso: nadie acumula retardos sin
 * enterarse, porque no puede registrar uno sin reconocerlo ahí mismo.
 */
export function needsReason(input: {
  mark: "clock_in" | "lunch_start" | "lunch_end" | "clock_out";
  scheduledStart: number | null;
  markedMinute: number;
  lunchStartedAt?: Date | null;
  markedAt?: Date;
}): boolean {
  if (input.mark === "clock_in") {
    // Sin horario capturado no hay contra qué comparar: no se le exige nada.
    if (input.scheduledStart === null) return false;
    return isRetardo(input.scheduledStart, input.markedMinute);
  }
  if (input.mark === "lunch_end" && input.lunchStartedAt && input.markedAt) {
    return isLunchTooLong(lunchMinutes(input.lunchStartedAt, input.markedAt));
  }
  return false;
}

/** La fecha en que caduca una anotación nacida en esta jornada. */
export function expiryFrom(workDate: Date): Date {
  const out = new Date(workDate);
  out.setUTCDate(out.getUTCDate() + INCIDENT_LIFE_DAYS);
  return out;
}

export interface StandingCount {
  retardos: number;
  faltas: number;
  isProspecto: boolean;
}

/**
 * El estado de un colaborador a partir de sus anotaciones vivas.
 *
 * Encadenadas, las reglas significan que nueve retardos llevan a prospecto de
 * baja aunque la persona no haya faltado un solo día.
 */
export function standing(live: { retardosLibres: number; faltas: number }): StandingCount {
  return {
    retardos: live.retardosLibres,
    faltas: live.faltas,
    isProspecto: live.faltas >= FALTAS_FOR_PROSPECTO,
  };
}

/** Cuántas faltas nuevas generan estos retardos sueltos. */
export function faltasFromRetardos(retardosLibres: number): number {
  return Math.floor(retardosLibres / RETARDOS_PER_FALTA);
}
