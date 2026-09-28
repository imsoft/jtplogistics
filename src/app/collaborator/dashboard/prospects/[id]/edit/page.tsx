"use client";

import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";
import { EditProspectView } from "@/components/dashboard/prospects/prospect-views";

export default function EditCollaboratorProspectPage() {
  const { permissions } = useCollaboratorPermissions();

  return (
    <EditProspectView
      basePath="/collaborator/dashboard/prospects"
      canDelete={permissions?.canDeleteProviderProspects ?? false}
    />
  );
}
