import { requireCollaboratorPermission } from "@/lib/collaborator-permissions";

export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCollaboratorPermission("canViewMessages");
  return <>{children}</>;
}
