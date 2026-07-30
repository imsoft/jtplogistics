import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
import type { MuralPermissions } from "@/types/mural.types";

/**
 * Permisos efectivos del usuario sobre el mural. El admin siempre tiene control
 * total; el colaborador depende de sus flags canView/Create/Update/DeleteMural.
 */
export async function GET() {
  try {
    const session = await requireCollaboratorOrAdmin();

    if (session.user.role === "admin") {
      const all: MuralPermissions = {
        canView: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      };
      return Response.json(all);
    }

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        canViewMural: true,
        canCreateMural: true,
        canUpdateMural: true,
        canDeleteMural: true,
      },
    });

    const permissions: MuralPermissions = {
      canView: Boolean(me?.canViewMural),
      canCreate: Boolean(me?.canCreateMural),
      canUpdate: Boolean(me?.canUpdateMural),
      canDelete: Boolean(me?.canDeleteMural),
    };

    return Response.json(permissions);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
