/**
 * Baja laboral de colaboradores.
 *
 * Dar de baja NO borra a la persona: borrarla se llevaría en cascada sus
 * checadas, faltas, permisos y mensajes, que son lo que respalda la baja. Se le
 * pone fecha de baja, se le quita el acceso y deja de salir en lo activo.
 *
 * Puro y sin base de datos, para poder probarlo.
 */

/** Filtro de Prisma: solo la gente que sigue en la empresa. */
export const ACTIVE_USERS = { offboardedOn: null } as const;

export const MIN_OFFBOARD_REASON = 5;

/** Dirección y soporte, o el colaborador con permiso de eliminar colaboradores. */
export function canOffboard(user: { role: string; canDeleteEmployees?: boolean | null }): boolean {
  if (user.role === "admin" || user.role === "developer") return true;
  return user.role === "collaborator" && Boolean(user.canDeleteEmployees);
}

export interface OffboardInput {
  /** "YYYY-MM-DD". */
  date: string;
  reason: string;
}

/**
 * Devuelve el error a mostrar, o null si la baja se puede registrar.
 * `today` es la fecha de hoy en la zona de la empresa, "YYYY-MM-DD".
 */
export function validateOffboard(
  input: { date?: unknown; reason?: unknown },
  ctx: { today: string; targetId: string; actorId: string; alreadyOffboarded: boolean }
): string | null {
  if (ctx.targetId === ctx.actorId) return "No puedes darte de baja a ti mismo.";
  if (ctx.alreadyOffboarded) return "Esta persona ya está dada de baja.";
  if (typeof input.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return "Escribe la fecha de baja.";
  }
  // Con fecha futura quedaría sin acceso desde hoy pero "activa" en papel.
  if (input.date > ctx.today) return "La fecha de baja no puede ser futura.";
  if (typeof input.reason !== "string" || input.reason.trim().length < MIN_OFFBOARD_REASON) {
    return "Escribe el motivo de la baja.";
  }
  return null;
}

/** Los datos de la baja, como viajan en las respuestas de la API. */
export function offboardJson(u: {
  offboardedOn?: Date | null;
  offboardReason?: string | null;
  offboardedByName?: string | null;
}) {
  return {
    offboardedOn: u.offboardedOn ? u.offboardedOn.toISOString().slice(0, 10) : null,
    offboardReason: u.offboardReason ?? null,
    offboardedByName: u.offboardedByName ?? null,
  };
}
