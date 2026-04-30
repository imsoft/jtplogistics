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
        canViewShipments: true,
        canViewFinances: true,
        canCreateMessages: true,
        canCreateIdeas: true,
        canCreateRoutes: true,
        canCreateRouteLogs: true,
        canCreateUnitTypes: true,
        canCreateQuotes: true,
        canCreateProviders: true,
        canCreateClients: true,
        canCreateEmployees: true,
        canCreateVendors: true,
        canCreateLaptops: true,
        canCreatePhones: true,
        canCreateEmails: true,
        canCreateTasks: true,
        canCreateShipments: true,
        canCreateFinances: true,
        canUpdateMessages: true,
        canUpdateIdeas: true,
        canUpdateRoutes: true,
        canUpdateRouteLogs: true,
        canUpdateUnitTypes: true,
        canUpdateQuotes: true,
        canUpdateProviders: true,
        canUpdateClients: true,
        canUpdateEmployees: true,
        canUpdateVendors: true,
        canUpdateLaptops: true,
        canUpdatePhones: true,
        canUpdateEmails: true,
        canUpdateTasks: true,
        canUpdateShipments: true,
        canUpdateFinances: true,
        canDeleteMessages: true,
        canDeleteIdeas: true,
        canDeleteRoutes: true,
        canDeleteRouteLogs: true,
        canDeleteUnitTypes: true,
        canDeleteQuotes: true,
        canDeleteProviders: true,
        canDeleteClients: true,
        canDeleteEmployees: true,
        canDeleteVendors: true,
        canDeleteLaptops: true,
        canDeletePhones: true,
        canDeleteEmails: true,
        canDeleteTasks: true,
        canDeleteShipments: true,
        canDeleteFinances: true,
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
