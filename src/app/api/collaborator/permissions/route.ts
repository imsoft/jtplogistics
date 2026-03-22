import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";

export async function GET() {
  try {
    const session = await requireCollaboratorOrAdmin();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canViewMessages: true, canViewIdeas: true },
    });

    return Response.json({
      canViewMessages: user?.canViewMessages ?? true,
      canViewIdeas: user?.canViewIdeas ?? true,
    });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
