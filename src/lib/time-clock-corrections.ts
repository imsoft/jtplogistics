/**
 * Correcciones de dirección y el recálculo que arrastran.
 *
 * Una corrección nunca modifica la checada original: es un renglón nuevo que
 * apunta a ella, con motivo y autor, y en pantalla se ven las dos. Eso es lo
 * que hace que el registro aguante un pleito laboral — y de paso protege a la
 * empresa de que alguien de adentro lo manipule.
 */

import type { Prisma, TimeClockEntry } from "@prisma/client";
import { RETARDOS_PER_FALTA, expiryFrom } from "@/lib/time-clock-rules";
import { todayDateOnly } from "@/lib/time-clock-judge";

type Tx = Prisma.TransactionClient;

/**
 * Las marcas que valen de una jornada, ya aplicadas las correcciones.
 *
 * Una marca anulada desaparece, una ajustada toma la hora nueva, y una
 * agregada entra aunque nadie la haya marcado. Las originales siguen en la
 * tabla: esto solo decide cuáles cuentan.
 */
export function effectiveMarks(entries: TimeClockEntry[]): TimeClockEntry[] {
  const corrections = entries.filter((e) => e.correctionKind !== null);
  const originals = entries.filter((e) => e.correctionKind === null);

  // La última corrección de cada original es la que manda.
  const byTarget = new Map<string, TimeClockEntry>();
  for (const c of corrections) {
    if (!c.correctionOfId) continue;
    const current = byTarget.get(c.correctionOfId);
    if (!current || c.createdAt > current.createdAt) byTarget.set(c.correctionOfId, c);
  }

  const result: TimeClockEntry[] = [];

  for (const original of originals) {
    const fix = byTarget.get(original.id);
    if (!fix) {
      result.push(original);
      continue;
    }
    if (fix.correctionKind === "void") continue;
    if (fix.correctionKind === "adjust") {
      result.push({ ...original, mark: fix.mark, markedAt: fix.markedAt });
    }
  }

  // Las agregadas no corrigen a nadie: nacen sueltas.
  for (const c of corrections) {
    if (c.correctionKind === "add") result.push(c);
  }

  return result.sort((a, b) => a.markedAt.getTime() - b.markedAt.getTime());
}

/**
 * Rehace las faltas de un colaborador cuando una corrección tocó un retardo.
 *
 * Solo se mete con las faltas que quedaron incompletas: si a una le
 * desaparecieron retardos de los tres que se había comido, se disuelve y los
 * que sobrevivieron vuelven a quedar sueltos. Después se vuelve a intentar la
 * conversión con lo que haya libre. No se recalcula el historial entero a
 * propósito — una falta ya cumplida no tiene por qué moverse porque alguien
 * corrigió otra cosa.
 */
export async function reconcileFaltas(tx: Tx, userId: string): Promise<void> {
  const faltas = await tx.timeClockIncident.findMany({
    where: { userId, kind: "falta" },
    select: { id: true, consumed: { select: { id: true } } },
  });

  const incompletas = faltas.filter((f) => f.consumed.length < RETARDOS_PER_FALTA);

  for (const falta of incompletas) {
    await tx.timeClockIncident.updateMany({
      where: { consumedById: falta.id },
      data: { consumedById: null },
    });
    await tx.timeClockIncident.delete({ where: { id: falta.id } });
  }

  // Con lo que quedó suelto y vivo, volver a armar faltas.
  const hoy = todayDateOnly();
  for (;;) {
    const libres = await tx.timeClockIncident.findMany({
      where: { userId, kind: "retardo", consumedById: null, expiresOn: { gte: hoy } },
      orderBy: { workDate: "asc" },
      select: { id: true, workDate: true },
    });
    if (libres.length < RETARDOS_PER_FALTA) break;

    const grupo = libres.slice(0, RETARDOS_PER_FALTA);
    const nace = grupo[grupo.length - 1].workDate;

    const falta = await tx.timeClockIncident.create({
      data: { userId, kind: "falta", workDate: nace, expiresOn: expiryFrom(nace) },
    });
    await tx.timeClockIncident.updateMany({
      where: { id: { in: grupo.map((g) => g.id) } },
      data: { consumedById: falta.id },
    });
  }
}
