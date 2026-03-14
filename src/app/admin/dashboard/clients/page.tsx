import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { ClientsTable } from "@/components/dashboard/resources/clients-table";

export const metadata = {
  title: "Clientes | JTP Logistics",
  description: "Gestionar clientes de la empresa",
};

export default function ClientsPage() {
  return (
    <ResourceListPage
      title="Clientes"
      description="Clientes registrados en el sistema."
      newHref="/admin/dashboard/clients/new"
      newLabel="Nuevo cliente"
    >
      <ClientsTable />
    </ResourceListPage>
  );
}
