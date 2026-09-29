/**
 * Lista de cuentas de correo, compartida por el panel de dirección y el de
 * colaboradores. Antes cada ruta armaba su propia respuesta y ya se habían
 * separado (la del colaborador no traía `hasPassword`).
 *
 * Sin importar Prisma a propósito: así se puede probar sin base de datos.
 */

import type { Prisma } from "@prisma/client";
import { hasSecret } from "@/lib/secret-vault";

export const EMAIL_ACCOUNT_LIST_INCLUDE = {
  assignees: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          employeeProfile: { select: { department: true } },
        },
      },
    },
  },
} satisfies Prisma.EmailAccountInclude;

type EmailAccountRow = Prisma.EmailAccountGetPayload<{ include: typeof EMAIL_ACCOUNT_LIST_INCLUDE }>;

/** Departamentos de todas las personas asignadas, sin repetir y en orden. */
export function assigneeDepartments(
  assignees: { user: { employeeProfile: { department: string | null } | null } }[]
): string[] {
  const set = new Set<string>();
  for (const a of assignees) {
    const d = a.user.employeeProfile?.department?.trim();
    if (d) set.add(d);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

export function emailAccountToJson(e: EmailAccountRow) {
  // Una cuenta compartida puede ser de varios departamentos: antes solo se
  // tomaba el del primer asignado y el filtro no encontraba a los demás.
  const departments = assigneeDepartments(e.assignees);
  return {
    id: e.id,
    type: e.type,
    email: e.email,
    hasPassword: hasSecret(e.password),
    departments,
    department: departments.length ? departments.join(", ") : null,
    assignees: e.assignees.map((a) => ({ id: a.user.id, name: a.user.name })),
    createdAt: e.createdAt.toISOString(),
  };
}

export const ALL = "all";

export interface EmailFilters {
  type: string;
  department: string;
}

/**
 * Si la cuenta pasa los filtros. Un filtro vacío cuenta como "todos": es lo
 * que deja la ✕ del selector, y antes vaciaba la tabla.
 */
export function matchesEmailFilters(
  email: { type: string; departments: string[] },
  filters: EmailFilters
): boolean {
  const type = filters.type || ALL;
  const department = filters.department || ALL;
  if (type !== ALL && email.type !== type) return false;
  if (department !== ALL && !email.departments.includes(department)) return false;
  return true;
}
