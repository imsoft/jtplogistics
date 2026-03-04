import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { VendorsTable } from "@/components/dashboard/resources/vendors-table";

export const metadata = {
  title: "Vendedores | JTP Logistics",
  description: "Gestionar vendedores del sistema",
};

export default function VendorsPage() {
  return (
    <ResourceListPage
      title="Vendedores"
      description="Vendedores registrados en el sistema."
      newHref="/admin/dashboard/vendors/new"
      newLabel="Nuevo vendedor"
    >
      <VendorsTable />
    </ResourceListPage>
  );
}
