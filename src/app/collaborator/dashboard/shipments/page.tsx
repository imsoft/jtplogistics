import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { ShipmentsTable } from "@/components/dashboard/resources/shipments-table";

export const metadata = {
  title: "Embarques | JTP Logistics",
  description: "Gestionar embarques",
};

export default function CollaboratorShipmentsPage() {
  return (
    <ResourceListPage
      title="Embarques"
      description="Embarques registrados en el sistema."
      newHref="/collaborator/dashboard/shipments/new"
      newLabel="Nuevo embarque"
    >
      <ShipmentsTable
        apiEndpoint="/api/collaborator/shipments"
        detailBasePath="/collaborator/dashboard/shipments"
      />
    </ResourceListPage>
  );
}
