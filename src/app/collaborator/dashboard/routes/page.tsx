import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { RoutesTable } from "@/components/dashboard/routes/routes-table";

export const metadata = {
  title: "Rutas | JTP Logistics",
  description: "Gestionar rutas de logística",
};

export default function CollaboratorRoutesPage() {
  return (
    <ResourceListPage
      title="Rutas"
      description="Rutas de entrega registradas en el sistema."
    >
      <RoutesTable
        apiEndpoint="/api/routes"
        detailBasePath="/collaborator/dashboard/routes"
      />
    </ResourceListPage>
  );
}
