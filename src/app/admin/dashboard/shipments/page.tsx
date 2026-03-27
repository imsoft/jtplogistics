import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { ShipmentsTable } from "@/components/dashboard/resources/shipments-table";

export const metadata = {
  title: "Tabla de embarques | JTP Logistics",
  description: "Gestionar embarques de la empresa",
};

export default function ShipmentsPage() {
  return (
    <ResourceListPage
      title="Tabla de embarques"
      description="Embarques registrados en el sistema."
      newHref="/admin/dashboard/shipments/new"
      newLabel="Nuevo embarque"
    >
      <ShipmentsTable />
    </ResourceListPage>
  );
}
