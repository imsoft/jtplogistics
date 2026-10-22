"use client";

import { EditLeadView } from "@/components/dashboard/client-leads/lead-views";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";

export default function EditCollaboratorClientLeadPage() {
  const { permissions } = useCollaboratorPermissions();
  return (
    <EditLeadView
      basePath="/collaborator/dashboard/client-leads"
      canDelete={permissions?.canDeleteClientLeads ?? false}
    />
  );
}
