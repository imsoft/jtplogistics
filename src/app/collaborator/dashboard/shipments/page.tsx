"use client";

import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { ShipmentsTable } from "@/components/dashboard/resources/shipments-table";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";

export default function CollaboratorShipmentsPage() {
  const { permissions } = useCollaboratorPermissions();
  const canCreate = Boolean(permissions?.canCreateShipments);

  return (
    <ResourceListPage
      title="Tabla de embarques"
      description="Embarques registrados en el sistema."
      newHref={canCreate ? "/collaborator/dashboard/shipments/new" : undefined}
      newLabel={canCreate ? "Nuevo embarque" : undefined}
    >
      <ShipmentsTable scope="collaborator" />
    </ResourceListPage>
  );
}
