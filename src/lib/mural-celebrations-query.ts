/**
 * Consultas de cumpleaños y aniversarios contra la BD.
 * La lógica de fechas vive en mural-celebrations.ts (módulo puro).
 */

import { prisma } from "@/lib/db";
import {
  celebrationsInRange,
  startOfUtcDay,
  type CelebrationPerson,
} from "@/lib/mural-celebrations";
import type { MuralCelebration } from "@/types/mural.types";

/** Máximo de días que se recorren de una sola consulta (un año y pico). */
const MAX_RANGE_DAYS = 400;

/** Carga al personal interno (admin y colaboradores) con sus fechas clave. */
export async function getCelebrationPeople(): Promise<CelebrationPerson[]> {
  const users = await prisma.user.findMany({
    where: { role: { in: ["admin", "collaborator"] } },
    select: {
      id: true,
      name: true,
      image: true,
      position: true,
      birthDate: true,
      employeeProfile: { select: { hireDate: true, position: true } },
    },
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    image: u.image,
    position: u.position ?? u.employeeProfile?.position ?? null,
    birthDate: u.birthDate,
    hireDate: u.employeeProfile?.hireDate ?? null,
  }));
}

/** Celebraciones entre dos fechas, leyendo de la BD. */
export async function getCelebrations(
  from: Date,
  to: Date
): Promise<MuralCelebration[]> {
  const start = startOfUtcDay(from);
  const cappedEnd = new Date(start.getTime() + MAX_RANGE_DAYS * 86_400_000);
  const end = startOfUtcDay(to) > cappedEnd ? cappedEnd : startOfUtcDay(to);
  const people = await getCelebrationPeople();
  return celebrationsInRange(people, start, end);
}
