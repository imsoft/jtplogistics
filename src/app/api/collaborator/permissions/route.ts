import { prisma } from "@/lib/db";
import { requireCollaboratorOrAdmin } from "@/lib/auth-server";

export async function GET() {
  try {
    const session = await requireCollaboratorOrAdmin();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        canViewMessages: true,
        canViewIdeas: true,
        canViewRoutes: true,
        canViewRouteLogs: true,
        canViewUnitTypes: true,
        canViewQuotes: true,
        canViewProviders: true,
        canViewClients: true,
        canViewEmployees: true,
        canViewVendors: true,
        canViewLaptops: true,
        canViewPhones: true,
        canViewEmails: true,
        canViewTasks: true,
        canCreateRecords: true,
        canReadRecords: true,
        canUpdateRecords: true,
        canDeleteRecords: true,
      },
    });

    if (!user) {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }

    return Response.json(user);
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
