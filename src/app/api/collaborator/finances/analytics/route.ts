import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";
import { computeFinancesAnalytics } from "@/lib/finances-analytics";

export async function GET() {
  try {
    const session = await requireCollaboratorOrAdmin();
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canViewFinances: true },
    });
    if (!me?.canViewFinances) {
      return Response.json({ error: "Sin permiso" }, { status: 403 });
    }
    return Response.json(await computeFinancesAnalytics());
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[collaborator/finances/analytics] GET", e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
