/**
 * El puente entre las reglas puras y la base: decide qué anotarle a una
 * checada y materializa las incidencias.
 *
 * Se ejecuta al marcar, dentro de la misma transacción, para que el contador
 * del colaborador esté al día en el instante en que aprieta el botón.
 */

import type { Prisma, TimeClockMark } from "@prisma/client";
import { COMPANY_TZ, workDateKey } from "@/lib/time-clock";
import {
  RETARDOS_PER_FALTA,
  expiryFrom,
  isLunchTooLong,
  isRetardo,
  lunchMinutes,
  minutesLate,
} from "@/lib/time-clock-rules";

/** Minutos desde la medianoche de un instante, en hora de la empresa. */
export function companyMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: COMPANY_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  // Medianoche puede venir como 24 en algunos entornos; se normaliza.
  return (get("hour") % 24) * 60 + get("minute");
}

/** Día de la semana de una jornada. work_date es DATE a medianoche UTC. */
export function weekdayOf(workDate: Date): number {
  return workDate.getUTCDay();
}

type Tx = Prisma.TransactionClient;

/**
 * Anota lo que corresponda por esta checada y devuelve qué se anotó.
 *
 * El orden importa: primero nace el retardo, y solo entonces se revisa si ya
 * hay tres sueltos que haya que convertir en falta.
 */
export async function judgeEntry(
  tx: Tx,
  input: {
    userId: string;
    entryId: string;
    mark: TimeClockMark;
    markedAt: Date;
    workDate: Date;
    scheduledStart: number | null;
    lunchStartedAt: Date | null;
  }
): Promise<{ retardo: boolean; comidaLarga: boolean; faltaGenerada: boolean }> {
  let retardo = false;
  let comidaLarga = false;

  if (input.mark === "clock_in" && input.scheduledStart !== null) {
    const marked = companyMinutes(input.markedAt);
    if (isRetardo(input.scheduledStart, marked)) {
      retardo = true;
      await tx.timeClockIncident.create({
        data: {
          userId: input.userId,
          kind: "retardo",
          workDate: input.workDate,
          expiresOn: expiryFrom(input.workDate),
          entryId: input.entryId,
          minutesLate: minutesLate(input.scheduledStart, marked),
        },
      });
    }
  }

  if (input.mark === "lunch_end" && input.lunchStartedAt) {
    const took = lunchMinutes(input.lunchStartedAt, input.markedAt);
    if (isLunchTooLong(took)) {
      comidaLarga = true;
      await tx.timeClockIncident.create({
        data: {
          userId: input.userId,
          kind: "comida_larga",
          workDate: input.workDate,
          expiresOn: expiryFrom(input.workDate),
          entryId: input.entryId,
          minutesLate: took - 60,
        },
      });
    }
  }

  // Cerrar la jornada sin haber marcado comida queda anotado para que RH lo
  // mire. No es falta: el sistema no puede distinguir el olvido de no haber
  // salido a comer, y castigar algo indistinguible sale caro.
  if (input.mark === "clock_out") {
    const lunches = await tx.timeClockEntry.count({
      where: { userId: input.userId, workDate: input.workDate, mark: "lunch_start" },
    });
    if (lunches === 0) {
      await tx.timeClockIncident.create({
        data: {
          userId: input.userId,
          kind: "sin_comida",
          workDate: input.workDate,
          expiresOn: expiryFrom(input.workDate),
          entryId: input.entryId,
        },
      });
    }
  }

  const faltaGenerada = retardo
    ? await convertRetardos(tx, input.userId, input.workDate)
    : false;

  return { retardo, comidaLarga, faltaGenerada };
}

/**
 * Convierte tres retardos sueltos en una falta y los marca como consumidos.
 *
 * Consumirlos es lo que impide que el cuarto retardo dispare otra falta de
 * inmediato: sin esto, la cuenta se dispararía sola.
 */
async function convertRetardos(tx: Tx, userId: string, workDate: Date): Promise<boolean> {
  const libres = await tx.timeClockIncident.findMany({
    where: {
      userId,
      kind: "retardo",
      consumedById: null,
      expiresOn: { gte: todayDateOnly() },
    },
    orderBy: { workDate: "asc" },
    select: { id: true },
  });

  if (libres.length < RETARDOS_PER_FALTA) return false;

  const aConsumir = libres.slice(0, RETARDOS_PER_FALTA).map((r) => r.id);

  const falta = await tx.timeClockIncident.create({
    data: {
      userId,
      kind: "falta",
      workDate,
      expiresOn: expiryFrom(workDate),
    },
  });

  await tx.timeClockIncident.updateMany({
    where: { id: { in: aConsumir } },
    data: { consumedById: falta.id },
  });

  return true;
}

/** Hoy como DATE a medianoche UTC, para comparar contra expires_on. */
export function todayDateOnly(): Date {
  const now = new Date();
  return new Date(`${workDateKey(now)}T00:00:00.000Z`);
}

/** Retardos y faltas que hoy siguen contando. */
export async function liveCounts(
  tx: Tx,
  userId: string
): Promise<{ retardosLibres: number; faltas: number }> {
  const hoy = todayDateOnly();
  const [retardosLibres, faltas] = await Promise.all([
    tx.timeClockIncident.count({
      where: { userId, kind: "retardo", consumedById: null, expiresOn: { gte: hoy } },
    }),
    tx.timeClockIncident.count({
      where: { userId, kind: "falta", expiresOn: { gte: hoy } },
    }),
  ]);
  return { retardosLibres, faltas };
}
