"use client";

import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { OnboardingsTable } from "@/components/dashboard/provider-onboardings/onboardings-table";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";

export default function CollaboratorProviderOnboardingsPage() {
  // El permiso de verdad se aplica en la API; aquí solo se esconde lo que no
  // se puede usar, para no ofrecer botones que van a rebotar con un 403.
  const { permissions } = useCollaboratorPermissions();

  return (
    <ResourceListPage
      title="Alta de proveedores"
      description="El expediente y el contrato de cada transportista que se está dando de alta."
      newHref={permissions?.canCreateProviderOnboardings ? "/collaborator/dashboard/provider-onboardings/new" : undefined}
      newLabel="Nueva alta"
    >
      <OnboardingsTable
        editBase="/collaborator/dashboard/provider-onboardings"
        canEdit={permissions?.canUpdateProviderOnboardings ?? false}
        canDelete={permissions?.canDeleteProviderOnboardings ?? false}
      />
    </ResourceListPage>
  );
}
