import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";

export async function GET() {
  try {
    const session = await requireCollaboratorOrAdmin();

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canViewProviders: true },
    });

    if (!me?.canViewProviders) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: { role: "carrier" },
      orderBy: { createdAt: "desc" },
      include: { profile: true },
    });

    return Response.json(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        createdAt: u.createdAt.toISOString(),
      }))
    );
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
