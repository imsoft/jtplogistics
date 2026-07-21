import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { VendorsTable } from "@/components/dashboard/resources/vendors-table";

export const metadata = {
  title: "Proveedores | JTP Logistics",
  description: "Gestionar proveedores",
};

export default function CollaboratorVendorsPage() {
  return (
    <ResourceListPage
      title="Proveedores"
      description="Proveedores registrados en el sistema."
      newHref="/collaborator/dashboard/vendors/new"
      newLabel="Nuevo proveedor"
    >
      <VendorsTable
        apiEndpoint="/api/collaborator/vendors"
        detailBasePath="/collaborator/dashboard/vendors"
      />
    </ResourceListPage>
  );
}
