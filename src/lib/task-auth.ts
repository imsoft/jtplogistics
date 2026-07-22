import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";

export type TaskPermField =
  | "canViewTasks"
  | "canCreateTasks"
  | "canUpdateTasks"
  | "canDeleteTasks";

/**
 * Exige sesión de admin (bypass) o colaborador con el permiso indicado sobre
 * tareas. Lanza una Response 403 si el colaborador no tiene el permiso.
 */
export async function gateTasks(field: TaskPermField) {
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
