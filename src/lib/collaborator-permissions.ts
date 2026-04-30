import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth-server";

type PermissionField =
  | "canViewMessages"
  | "canViewIdeas"
  | "canViewRoutes"
  | "canViewRouteLogs"
  | "canViewUnitTypes"
  | "canViewQuotes"
  | "canViewProviders"
  | "canViewClients"
  | "canViewEmployees"
  | "canViewVendors"
  | "canViewLaptops"
  | "canViewPhones"
  | "canViewEmails"
  | "canViewTasks";
type CrudPermissionField =
  | "canCreateRecords"
  | "canReadRecords"
  | "canUpdateRecords"
  | "canDeleteRecords";

/**
 * Checks that the current collaborator has a specific permission.
 * Redirects to profile if not allowed. Admins always pass.
 */
export async function requireCollaboratorPermission(field: PermissionField) {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.user.role === "admin") return session;

  if (session.user.role !== "collaborator") redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      canReadRecords: true,
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
    },
  });

  if (!user || !user.canReadRecords || !user[field]) {
    redirect("/collaborator/dashboard/profile");
  }

  return session;
}

export async function requireCollaboratorCrudPermission(field: CrudPermissionField) {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.user.role === "admin") return session;
  if (session.user.role !== "collaborator") redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      canCreateRecords: true,
      canReadRecords: true,
      canUpdateRecords: true,
      canDeleteRecords: true,
    },
  });

  if (!user || !user[field]) {
    redirect("/collaborator/dashboard/profile");
  }

  return session;
}
