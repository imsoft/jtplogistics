"use client";

import { useSession } from "@/lib/auth-client";
import { LeadDetailView } from "@/components/dashboard/client-leads/lead-detail";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";
import { ResourceDetailSkeleton } from "@/components/ui/skeletons";

export default function CollaboratorClientLeadPage() {
  const { data: session } = useSession();
  const { permissions, isLoaded } = useCollaboratorPermissions();
  if (!isLoaded) return <ResourceDetailSkeleton />;
  return (
    <LeadDetailView
      basePath="/collaborator/dashboard/client-leads"
      panelBase="/collaborator/dashboard"
      clientsEndpoint="/api/collaborator/clients"
      canEdit={permissions?.canUpdateClientLeads ?? false}
      canDelete={permissions?.canDeleteClientLeads ?? false}
      currentUserId={session?.user.id ?? null}
    />
  );
}
