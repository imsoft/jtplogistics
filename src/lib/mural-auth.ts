import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";

export type MuralPermField =
  | "canViewMural"
  | "canCreateMural"
  | "canUpdateMural"
  | "canDeleteMural";

/**
 * Exige sesión de admin (bypass) o colaborador con el permiso indicado sobre el
 * mural. Lanza una Response 403 si el colaborador no tiene el permiso.
 */
export async function gateMural(field: MuralPermField) {
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

/**
 * Envuelve un handler de API del mural: verifica el permiso y normaliza errores.
 */
export function muralHandler(
  field: MuralPermField,
  fn: (session: Awaited<ReturnType<typeof gateMural>>) => Promise<Response>
): Promise<Response> {
  return (async () => {
    try {
      const session = await gateMural(field);
      return await fn(session);
    } catch (e) {
      if (e instanceof Response) return e;
      console.error("[mural]", e);
      return Response.json({ error: "Error interno del servidor" }, { status: 500 });
    }
  })();
}
