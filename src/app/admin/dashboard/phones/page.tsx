import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { PhonesTable } from "@/components/dashboard/resources/phones-table";

export const metadata = {
  title: "Celulares | JTP Logistics",
  description: "Gestionar celulares de la empresa",
};

export default function PhonesPage() {
  return (
    <ResourceListPage
      title="Celulares"
      description="Celulares registrados y su asignación."
      newHref="/admin/dashboard/phones/new"
      newLabel="Nuevo celular"
    >
      <PhonesTable />
    </ResourceListPage>
  );
}
