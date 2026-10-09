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

export async function requireModuleAccess(suffix: string, action: ModuleAction) {
  const session = await requireSession();
  const { role, id } = session.user;

  // Dirección y soporte de TI entran por su rol, como en el resto del sistema.
  if (role === "admin" || role === "developer") return session;

  if (role === "collaborator") {
    const field = `${PREFIX[action]}${suffix}`;
    const me = await prisma.user.findUnique({
      where: { id },
      select: { [field]: true },
    });
    if (me && (me as Record<string, unknown>)[field]) return session;
  }

  throw new Response(JSON.stringify({ error: "Sin permiso" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}
