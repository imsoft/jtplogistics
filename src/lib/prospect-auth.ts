/**
 * Quién puede usar la prospección de proveedores.
 *
 * Una sola puerta para los dos paneles. Tener una copia por panel fue lo que
 * dejó rota la pantalla de Clientes del colaborador: se actualizó una y la
 * otra se quedó atrás.
 */

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";

type ProspectAction = "view" | "create" | "update" | "delete";

const FIELD_BY_ACTION: Record<ProspectAction, string> = {
  view: "canViewProviderProspects",
  create: "canCreateProviderProspects",
  update: "canUpdateProviderProspects",
  delete: "canDeleteProviderProspects",
};

export async function requireProspectAccess(action: ProspectAction) {
  const session = await requireSession();
  const { role, id } = session.user;

  // Dirección y soporte de TI entran por su rol, como en el resto del sistema.
  if (role === "admin" || role === "developer") return session;

  if (role === "collaborator") {
    const field = FIELD_BY_ACTION[action];
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
