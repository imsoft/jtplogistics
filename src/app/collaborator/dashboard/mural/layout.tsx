import { requireCollaboratorPermission } from "@/lib/collaborator-permissions";

export default async function MuralLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCollaboratorPermission("canViewMural");
  return <>{children}</>;
}
