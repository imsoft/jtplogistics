import { requireCollaboratorPermission } from "@/lib/collaborator-permissions";

export default async function IdeasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCollaboratorPermission("canViewIdeas");
  return <>{children}</>;
}
