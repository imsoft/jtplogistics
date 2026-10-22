/**
 * Una sola puerta por módulo para los dos paneles. Tener una copia por panel
 * fue lo que dejó rota la pantalla de Clientes del colaborador: se actualizó
 * una y la otra se quedó atrás.
 *
 * `suffix` es el de PERMISSION_MODULES: "ProviderProspects" → canView/Create/
 * Update/DeleteProviderProspects.
 */

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";

export type ModuleAction = "view" | "create" | "update" | "delete";

const PREFIX: Record<ModuleAction, string> = {
  view: "canView",
  create: "canCreate",
  update: "canUpdate",
  delete: "canDelete",
};

/**
 * Si una sesión ya abierta tiene permiso sobre otro módulo, sin lanzar. Sirve
 * para acciones que cruzan módulos (p. ej. convertir un prospecto en cliente).
 */
export async function hasModuleAccess(
  user: { id: string; role?: string | null },
  suffix: string,
  action: ModuleAction
): Promise<boolean> {
  // Dirección y soporte de TI entran por su rol, como en el resto del sistema.
  if (user.role === "admin" || user.role === "developer") return true;
  if (user.role !== "collaborator") return false;
  const field = `${PREFIX[action]}${suffix}`;
  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { [field]: true } });
  return Boolean(me && (me as Record<string, unknown>)[field]);
}

export async function requireModuleAccess(suffix: string, action: ModuleAction) {
  const session = await requireSession();
  if (await hasModuleAccess(session.user, suffix, action)) return session;

  throw new Response(JSON.stringify({ error: "Sin permiso" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}
