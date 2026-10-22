"use client";

import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { LeadsTable } from "@/components/dashboard/client-leads/leads-table";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";

export default function CollaboratorClientLeadsPage() {
  // El permiso de verdad se aplica en la API; aquí solo se esconde lo que no
  // se puede usar, para no ofrecer botones que van a rebotar con un 403.
  const { permissions } = useCollaboratorPermissions();

  return (
    <ResourceListPage
      title="CRM de clientes"
      description="Las empresas a las que se les quiere vender, en qué etapa va cada una y qué toca hacer."
      newHref={permissions?.canCreateClientLeads ? "/collaborator/dashboard/client-leads/new" : undefined}
      newLabel="Nuevo prospecto"
    >
      <LeadsTable
        basePath="/collaborator/dashboard/client-leads"
        canEdit={permissions?.canUpdateClientLeads ?? false}
        canDelete={permissions?.canDeleteClientLeads ?? false}
      />
    </ResourceListPage>
  );
}
