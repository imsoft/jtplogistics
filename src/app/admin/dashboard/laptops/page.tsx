import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { LaptopsTable } from "@/components/dashboard/resources/laptops-table";

export const metadata = {
  title: "Laptops | JTP Logistics",
  description: "Gestionar laptops de la empresa",
};

export default function LaptopsPage() {
  return (
    <ResourceListPage
      title="Laptops"
      description="Laptops registradas y su asignación."
      newHref="/admin/dashboard/laptops/new"
      newLabel="Nueva laptop"
    >
      <LaptopsTable />
    </ResourceListPage>
  );
}
