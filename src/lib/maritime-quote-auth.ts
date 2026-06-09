import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";

export type MaritimePermField =
  | "canViewMaritimeQuotes"
  | "canCreateMaritimeQuotes"
  | "canUpdateMaritimeQuotes"
  | "canDeleteMaritimeQuotes";

/**
 * Exige sesión de admin (bypass) o colaborador con el permiso indicado.
 * Lanza una Response 403 si el colaborador no tiene el permiso.
 */
export async function gateMaritime(field: MaritimePermField) {
  const session = await requireCollaboratorOrAdmin();
  if (session.user.role === "collaborator") {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { [field]: true },
    });
    if (!me || !(me as Record<string, unknown>)[field]) {
      throw Response.json({ error: "Sin permiso" }, { status: 403 });
    }
  }
  return session;
}
