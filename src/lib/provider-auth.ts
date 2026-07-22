import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";

export type ProviderPermField =
  | "canViewProviders"
  | "canCreateProviders"
  | "canUpdateProviders"
  | "canDeleteProviders";

/**
 * Exige sesión de admin (bypass) o colaborador con el permiso indicado sobre
 * proveedores. Lanza una Response 403 si el colaborador no tiene el permiso.
 *
 * Devuelve la sesión y si el actor es colaborador (para que el endpoint pueda
 * restringir la operación únicamente a usuarios "carrier").
 */
export async function gateProviders(field: ProviderPermField) {
  const session = await requireCollaboratorOrAdmin();
  const isCollaborator = session.user.role === "collaborator";
  if (isCollaborator) {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { [field]: true },
    });
    if (!me || !(me as Record<string, unknown>)[field]) {
      throw Response.json({ error: "Sin permiso" }, { status: 403 });
    }
  }
  return { session, isCollaborator };
}
