/**
 * A quién se le avisa cuando un proveedor pide desbloquear una ruta.
 *
 * Puro y sin base de datos, para poder probarlo. La regla es una sola: se le
 * avisa a todo el que puede autorizar, que es justo lo que valida
 * `gateProviders("canUpdateProviders")` al aprobar. Antes solo se avisaba a
 * dirección, y pricing podía autorizar pero nunca se enteraba.
 */

export interface UnlockApprover {
  id: string;
  name: string;
  email: string;
  role: string;
  canUpdateProviders: boolean;
}

/** Filtro de Prisma con las mismas personas que `canApproveUnlock`. */
export const UNLOCK_APPROVERS_WHERE = {
  OR: [
    { role: "admin" as const },
    { role: "collaborator" as const, canUpdateProviders: true },
  ],
};

export function canApproveUnlock(user: Pick<UnlockApprover, "role" | "canUpdateProviders">): boolean {
  return user.role === "admin" || (user.role === "collaborator" && user.canUpdateProviders);
}

/** La ficha del proveedor en el panel de cada quien: ahí se autoriza. */
export function unlockApprovalHref(role: string, carrierId: string): string {
  return role === "admin"
    ? `/admin/dashboard/users/${carrierId}`
    : `/collaborator/dashboard/providers/${carrierId}`;
}

export function unlockRequestRecipients(users: UnlockApprover[], carrierId: string) {
  return users.filter(canApproveUnlock).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    href: unlockApprovalHref(u.role, carrierId),
  }));
}
