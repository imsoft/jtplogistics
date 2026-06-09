import { requireCollaboratorPermission } from "@/lib/collaborator-permissions";

export default async function MaritimeQuotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCollaboratorPermission("canViewMaritimeQuotes");
  return <>{children}</>;
}
