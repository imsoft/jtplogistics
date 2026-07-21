import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { ClientsTable } from "@/components/dashboard/resources/clients-table";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";

export const metadata = {
  title: "Clientes | JTP Logistics",
  description: "Gestionar clientes",
};

export default function CollaboratorClientsPage() {
  // Nota: Los permisos se validan en el servidor (API endpoints)
  // Esta página muestra el botón "Nuevo cliente" siempre que el usuario
  // tenga acceso a /collaborator/dashboard/clients
  return (
    <ResourceListPage
      title="Clientes"
      description="Clientes registrados en el sistema."
      newHref="/collaborator/dashboard/clients/new"
      newLabel="Nuevo cliente"
    >
      <ClientsTable
        apiEndpoint="/api/collaborator/clients"
        detailBasePath="/collaborator/dashboard/clients"
      />
    </ResourceListPage>
  );
}
