"use client";

import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { ProspectsTable } from "@/components/dashboard/prospects/prospects-table";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";

export default function CollaboratorProspectsPage() {
  // El permiso de verdad se aplica en la API; aquí solo se esconde lo que no
  // se puede usar, para no ofrecer botones que van a rebotar con un 403.
  const { permissions } = useCollaboratorPermissions();

  return (
    <ResourceListPage
      title="Prospección de proveedores"
      description="Transportistas que se están prospectando y en qué etapa va cada uno."
      newHref={permissions?.canCreateProviderProspects ? "/collaborator/dashboard/prospects/new" : undefined}
      newLabel="Nuevo prospecto"
    >
      <ProspectsTable
        editBase="/collaborator/dashboard/prospects"
        canEdit={permissions?.canUpdateProviderProspects ?? false}
        canDelete={permissions?.canDeleteProviderProspects ?? false}
      />
    </ResourceListPage>
  );
}
