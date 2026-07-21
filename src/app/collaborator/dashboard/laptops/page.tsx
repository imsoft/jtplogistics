import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { LaptopsTable } from "@/components/dashboard/resources/laptops-table";

export const metadata = {
  title: "Laptops | JTP Logistics",
  description: "Gestionar computadoras portátiles",
};

export default function CollaboratorLaptopsPage() {
  return (
    <ResourceListPage
      title="Laptops"
      description="Computadoras portátiles de la empresa."
      newHref="/collaborator/dashboard/laptops/new"
      newLabel="Nueva laptop"
    >
      <LaptopsTable
        apiEndpoint="/api/collaborator/laptops"
        detailBasePath="/collaborator/dashboard/laptops"
      />
    </ResourceListPage>
  );
}
